from __future__ import annotations

import json
import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import Any, cast

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from middleware.idempotency import IdempotencyMiddleware
from routers import (
    agent as agent_router,
)
from routers import (
    auth as auth_router,
)
from routers import (
    habits as habits_router,
)
from routers import (
    internal as internal_router,
)
from routers import (
    journal as journal_router,
)
from routers import (
    pomodoro as pomodoro_router,
)
from routers import (
    realtime as realtime_router,
)
from routers import (
    tasks as tasks_router,
)
from routers.audio_pipeline import router as audio_pipeline_router
from routers.system import router as system_router
from services.idempotency import prune_old_keys
from storage.database import SessionLocal, init_db

load_dotenv()

if sys.stdout.encoding != "utf-8":
    _reconf = getattr(sys.stdout, "reconfigure", None)
    if callable(_reconf):
        _reconf(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    _reconf = getattr(sys.stderr, "reconfigure", None)
    if callable(_reconf):
        _reconf(encoding="utf-8")

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
REQUEST_ID_HEADER = "x-request-id"


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get("-")
        return True


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s [RequestID: %(request_id)s] %(message)s",
)
logging.getLogger().addFilter(RequestIdFilter())

_orig_record_factory = logging.getLogRecordFactory()


def _record_factory(*args, **kwargs):
    record = _orig_record_factory(*args, **kwargs)
    if not hasattr(record, "request_id"):
        try:
            record.request_id = request_id_ctx.get("-")
        except Exception:
            record.request_id = "-"
    return record


logging.setLogRecordFactory(_record_factory)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        with SessionLocal() as db:
            deleted = prune_old_keys(db)
            logging.info("Pruned %s old idempotency keys", deleted)
    except Exception:
        logging.exception("Database initialization failed")

    if os.getenv("PRELOAD_STT", "false").lower() == "true":
        from services.ai_clients import ensure_stt_loaded

        try:
            await ensure_stt_loaded()
        except (RuntimeError, ImportError) as exc:
            logging.warning(
                "Skipping local STT preload because optional ML dependencies "
                "are unavailable: %s",
                exc,
            )
    try:
        yield
    finally:
        pass


def _normalize_request_id(value: str | None) -> str:
    candidate = (value or "").strip()
    return candidate if candidate else str(uuid.uuid4())


def _request_id_from_scope_headers(headers: list[tuple[bytes, bytes]]) -> str:
    for key, value in headers:
        if key.decode("latin1").strip().lower() == REQUEST_ID_HEADER:
            return _normalize_request_id(value.decode("latin1"))
    return str(uuid.uuid4())


def _request_id_from_ws_frame_text(frame_text: str) -> str | None:
    text = (frame_text or "").strip()
    if not text:
        return None

    try:
        payload = json.loads(text)
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None

    for key in ("request_id", "x_request_id", "x-request-id"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return _normalize_request_id(value)

    return None


class CorrelationIdMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        scope_type = scope.get("type")
        if scope_type not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return

        rid = _request_id_from_scope_headers(scope.get("headers", []))
        token = request_id_ctx.set(rid)

        async def traced_receive() -> Message:
            message = await receive()
            if (
                scope_type == "websocket"
                and message.get("type") == "websocket.receive"
                and isinstance(message.get("text"), str)
            ):
                frame_rid = _request_id_from_ws_frame_text(message["text"])
                if frame_rid:
                    request_id_ctx.set(frame_rid)
            return message

        async def traced_send(message: Message) -> None:
            if message.get("type") in {"http.response.start", "websocket.accept"}:
                headers = list(message.get("headers", []))
                active_rid = request_id_ctx.get(rid)
                headers.append((b"x-request-id", active_rid.encode("utf-8")))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, traced_receive, traced_send)
        finally:
            request_id_ctx.reset(token)


def parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000"]
    return [p.strip() for p in value.split(",") if p.strip()] or [
        "http://localhost:3000"
    ]


def create_app() -> FastAPI:
    app = FastAPI(title="Nargis AI Service", lifespan=lifespan)

    app.add_middleware(cast(Any, CorrelationIdMiddleware))
    app.add_middleware(cast(Any, IdempotencyMiddleware))

    allowed_origins = parse_origins(os.getenv("ALLOWED_ORIGINS"))
    logging.info("CORS allow_origins=%s", allowed_origins)
    app.add_middleware(
        cast(Any, CORSMiddleware),
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(system_router)
    app.include_router(audio_pipeline_router)
    app.include_router(agent_router.router)
    app.include_router(auth_router.router)
    app.include_router(tasks_router.router)
    app.include_router(habits_router.router)
    app.include_router(pomodoro_router.router)
    app.include_router(journal_router.router)
    app.include_router(realtime_router.router)
    app.include_router(internal_router.router, prefix="/api")

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        try:
            from utils.response import make_error_from_detail

            payload = make_error_from_detail(
                exc.detail, default_code=str(exc.status_code)
            )
        except Exception:
            payload = {
                "error": {"code": str(exc.status_code), "message": str(exc.detail)}
            }
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logging.exception("Unhandled exception during request")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Internal server error",
                }
            },
        )

    return app
