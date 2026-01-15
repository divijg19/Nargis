import json
import logging
import os
import sys
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import Any, cast

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, StreamingResponse

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
    journal as journal_router,
)
from routers import (
    pomodoro as pomodoro_router,
)

# Import routers at module top so all imports are at the top-level (fixes E402)
from routers import (
    tasks as tasks_router,
)
from routers.auth import get_optional_user
from services.agent_service import run_agent_pipeline
from services.idempotency import prune_old_keys
from storage.database import SessionLocal, get_db, init_db

# Explicitly load the .env file to ensure configuration is always read.
load_dotenv()

# Force all output streams to use UTF-8 encoding.
if sys.stdout.encoding != "utf-8":
    _reconf = getattr(sys.stdout, "reconfigure", None)
    if callable(_reconf):
        _reconf(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    _reconf = getattr(sys.stderr, "reconfigure", None)
    if callable(_reconf):
        _reconf(encoding="utf-8")

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


# THIS IS THE LOGGING FIX: It safely handles logs from external libraries.
class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get("-")
        return True


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s request_id=%(request_id)s %(message)s",
)
logging.getLogger().addFilter(RequestIdFilter())

# Ensure every LogRecord has a request_id attribute even if some handlers or
# libraries bypass filters — wrap the LogRecord factory to inject a default.
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
    # Startup: optionally preload STT if configured
    # Ensure DB tables exist before serving any requests
    try:
        init_db()
        # Prune old idempotency keys on startup
        with SessionLocal() as db:
            deleted = prune_old_keys(db)
            logging.info(f"Pruned {deleted} old idempotency keys")
    except Exception:
        # Avoid crashing startup in degenerate environments; tests will reveal issues
        logging.exception("Database initialization failed")
    if os.getenv("PRELOAD_STT", "false").lower() == "true":
        from services.ai_clients import ensure_stt_loaded

        await ensure_stt_loaded()
    try:
        yield
    finally:
        # Place shutdown tasks here if needed in future
        pass


app = FastAPI(title="Nargis AI Service", lifespan=lifespan)

# TTS configuration used by the /tts endpoint (kept in main for routing concerns)
TTS_URL = os.getenv("TTS_URL", "")
TTS_API_KEY = os.getenv("TTS_API_KEY", "")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_ctx.set(rid)
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


app.add_middleware(cast(Any, CorrelationIdMiddleware))
app.add_middleware(cast(Any, IdempotencyMiddleware))

app.include_router(agent_router.router)
app.include_router(auth_router.router)
app.include_router(tasks_router.router)
app.include_router(habits_router.router)
app.include_router(pomodoro_router.router)
app.include_router(journal_router.router)


def parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000"]
    return [p.strip() for p in value.split(",") if p.strip()] or [
        "http://localhost:3000"
    ]


allowed_origins = parse_origins(os.getenv("ALLOWED_ORIGINS"))
logging.info(f"CORS allow_origins={allowed_origins}")
app.add_middleware(
    cast(Any, CORSMiddleware),
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "nargis-api", "health": "/health"}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Normalize HTTPException.detail into our standard envelope
    try:
        from utils.response import make_error_from_detail

        payload = make_error_from_detail(exc.detail, default_code=str(exc.status_code))
    except Exception:
        payload = {"error": {"code": str(exc.status_code), "message": str(exc.detail)}}
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Catch-all for unexpected errors; do not leak internals
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


# AI client implementations live in apps/api-py/services/ai_clients.py


@app.post("/api/v1/process-audio")
async def process_audio_pipeline(
    request: Request,
    audio_file: UploadFile = File(...),
    mode: str = Query("chat", description="chat (default) or agent"),
    current_user: dict | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Stream agent events and final response as NDJSON lines.
    Protocol:
      {"type": "thought", "content": "..."}
      {"type": "tool_use", "tool": "...", "input": "..."}
      {"type": "response", "content": "..."}
      {"type": "error", "content": "..."}
    """
    # Local imports to avoid module-level imports that depend on env/config
    from services.ai_clients import _get_llm_response, _get_transcription

    mode_norm = (mode or "chat").strip().lower()
    if mode_norm not in {"chat", "agent"}:
        raise HTTPException(status_code=400, detail="Invalid mode")
    if mode_norm == "agent" and current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id: str | None = None
    if mode_norm == "agent":
        # Capture outside the nested generator so type narrowing is preserved.
        user = cast(dict[str, Any], current_user)
        user_id = str(user["id"])

    audio_bytes = await audio_file.read()
    transcribed_text = await _get_transcription(audio_bytes)

    if not transcribed_text or not transcribed_text.strip():
        # Immediate short-circuit response as NDJSON (include end marker)
        async def empty_stream() -> AsyncGenerator[bytes, None]:
            yield (
                json.dumps({"type": "response", "content": "I didn't catch that."})
                + "\n"
            ).encode()
            yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()

        return StreamingResponse(empty_stream(), media_type="application/x-ndjson")

    async def event_stream() -> AsyncGenerator[bytes, None]:
        try:
            # Always emit transcript first so clients can show what was heard.
            yield (
                json.dumps({"type": "transcript", "content": transcribed_text}) + "\n"
            ).encode()

            # Default: chat mode (no tools, no DB context) even if authenticated.
            if mode_norm == "chat":
                if current_user is None:
                    yield (
                        json.dumps(
                            {
                                "type": "thought",
                                "content": "Guest mode — sign in to save history.",
                            }
                        )
                        + "\n"
                    ).encode()

                llm_result = await _get_llm_response(transcribed_text)
                final_text = (
                    llm_result.get("reply")
                    or llm_result.get("output")
                    or llm_result.get("text")
                    or str(llm_result)
                )
                yield (
                    json.dumps({"type": "response", "content": final_text}) + "\n"
                ).encode()
                yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
                return

            # Agent mode: authenticated only.
            assert user_id is not None
            async for chunk in run_agent_pipeline(transcribed_text, user_id, db):
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception:
            logging.exception("Error in event stream")
            yield (
                json.dumps({"type": "error", "content": "Something went wrong."}) + "\n"
            ).encode()
            yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
        return

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    # Local imports to avoid module-level imports that may depend on env
    from services.ai_clients import (
        DEEPGRAM_API_KEY,
        GROQ_API_KEY,
        LLM_URL,
        STT_URL,
        ollama_client,
        stt_model,
    )

    return {
        "status": "ready"
        if (ollama_client or (LLM_URL and GROQ_API_KEY))
        else "degraded",
        "sttLoaded": stt_model is not None,
        "ollamaClient": ollama_client is not None,
        "sttExternalConfigured": bool(STT_URL and DEEPGRAM_API_KEY),
        "llmExternalConfigured": bool(LLM_URL and GROQ_API_KEY),
    }


# NOTE: Startup/shutdown handling is implemented via the `lifespan`
# async context manager supplied to FastAPI above. This replaces the
# deprecated `@app.on_event("startup")` decorator.


class TTSRequest(BaseModel):
    text: str


@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    if not TTS_URL or not TTS_API_KEY:
        raise HTTPException(status_code=501, detail="TTS not configured")
    try:
        headers = {"Authorization": f"Bearer {TTS_API_KEY}"}
        from services.ai_clients import HTTP_TIMEOUT

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(TTS_URL, json={"text": req.text}, headers=headers)
            resp.raise_for_status()
            return Response(
                content=resp.content,
                media_type=resp.headers.get("content-type", "audio/mpeg"),
            )
    except Exception as e:
        logging.exception("TTS proxy failed")
        raise HTTPException(status_code=502, detail=f"TTS service error: {e}") from e
