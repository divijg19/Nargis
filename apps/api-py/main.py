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
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
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
from routers.auth import get_current_user
from services.agent_service import run_agent_pipeline
from services.context import get_system_context
from services.idempotency import prune_old_keys
from storage.database import SessionLocal, get_db, init_db

try:
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError:
    HumanMessage: Any = None
    SystemMessage: Any = None

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
    current_user: dict = Depends(get_current_user),
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
    from agent import graph as agent_graph
    from services.ai_clients import _get_llm_response, _get_transcription

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
            async for chunk in run_agent_pipeline(
                transcribed_text, current_user["id"], db
            ):
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception:
            logging.exception("Error in event stream")
            yield (
                json.dumps({"type": "error", "content": "Something went wrong."}) + "\n"
            ).encode()
        return

    async def _unused_old_code():
        try:
            # Emit an immediate thought after STT to reduce perceived latency
            yield (
                json.dumps({"type": "thought", "content": "Processing…"}) + "\n"
            ).encode()

            # If agent runtime or streaming API not available, fall back to linear LLM
            if not getattr(agent_graph, "agent_app", None) or not hasattr(
                agent_graph.agent_app, "astream_events"
            ):
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

            # Inject system context
            context_str = get_system_context(current_user["id"], db)

            # Prepare input payload
            if HumanMessage and SystemMessage:
                messages = [
                    SystemMessage(content=f"System Context: {context_str}"),
                    HumanMessage(content=transcribed_text),
                ]
                input_payload = {"messages": messages}
            else:
                input_payload = {
                    "input": f"Context: {context_str}\nUser: {transcribed_text}"
                }

            # Stream events from agent.graph.agent_app.astream_events(...)
            # (async generator)
            # We use version="v1" to get standard LangChain event shapes
            async for ev in agent_graph.agent_app.astream_events(
                input_payload, version="v1"
            ):
                # If client disconnected, stop streaming promptly
                try:
                    if await request.is_disconnected():
                        yield (
                            json.dumps({"type": "end", "content": "canceled"}) + "\n"
                        ).encode()
                        return
                except Exception:
                    # If disconnect check fails, continue best-effort
                    pass
                # Normalize event access defensively
                if ev is None:
                    continue

                kind = ev.get("event")

                # High-level chain/model starts -> emit lightweight thoughts
                # for transparency
                if kind == "on_chain_start":
                    name = ev.get("name") or "chain"
                    if name and name != "LangGraph":
                        yield (
                            json.dumps(
                                {
                                    "type": "thought",
                                    "content": f"Starting {name}…",
                                }
                            )
                            + "\n"
                        ).encode()
                        continue

                if kind == "on_chat_model_start":
                    yield (
                        json.dumps(
                            {
                                "type": "thought",
                                "content": "Formulating response…",
                            }
                        )
                        + "\n"
                    ).encode()
                    continue

                # Tool Usage -> "tool_use"
                if kind == "on_tool_start":
                    tool_name = ev.get("name", "unknown")
                    # data.input might be a dict or string
                    tool_input = str(ev.get("data", {}).get("input", ""))
                    yield (
                        json.dumps(
                            {"type": "tool_use", "tool": tool_name, "input": tool_input}
                        )
                        + "\n"
                    ).encode()
                    continue

                # Tool Result -> "tool_result"
                if kind == "on_tool_end":
                    tool_name = ev.get("name", "unknown")
                    output = ev.get("data", {}).get("output")
                    # Serialize output safely
                    output_str = str(output)
                    yield (
                        json.dumps(
                            {
                                "type": "tool_result",
                                "tool": tool_name,
                                "result": output_str,
                            }
                        )
                        + "\n"
                    ).encode()
                    continue

                # Chat Model Stream -> Optional thought tokens (omitted to avoid spam)
                # If desired, we could aggregate tokens and emit periodic thoughts.

                # Final Result -> "response"
                # LangGraph 'on_chain_end' for the root graph usually contains
                # the final output
                if kind == "on_chain_end" and ev.get("name") == "LangGraph":
                    output = ev.get("data", {}).get("output")
                    if output:
                        # Extract the final response from the agent state
                        # Adjust key based on your graph's output schema
                        # (usually 'messages' or 'output')
                        content = None
                        if isinstance(output, dict):
                            # If output is a dict with 'messages',
                            # get the last AI message
                            if "messages" in output and isinstance(
                                output["messages"], list
                            ):
                                last_msg = output["messages"][-1]
                                if hasattr(last_msg, "content"):
                                    content = last_msg.content
                                elif isinstance(last_msg, dict):
                                    content = last_msg.get("content")
                            # Fallback: check for 'output' key
                            if not content:
                                content = output.get("output")
                        else:
                            content = str(output)

                        if content:
                            yield (
                                json.dumps(
                                    {"type": "response", "content": str(content)}
                                )
                                + "\n"
                            ).encode()
                            # Optional: emit an end-of-stream marker
                            # for downstream clarity
                            yield (
                                json.dumps({"type": "end", "content": "done"}) + "\n"
                            ).encode()

        except Exception as e:
            logging.exception("Agent streaming error")
            err_line = json.dumps({"type": "error", "content": str(e)}) + "\n"
            yield err_line.encode()

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
