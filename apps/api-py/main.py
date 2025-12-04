import logging
import sys
import os
import uuid
from typing import Optional, List, AsyncGenerator
from contextvars import ContextVar
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, StreamingResponse
import json
from dotenv import load_dotenv

# Import routers at module top so all imports are at the top-level (fixes E402)
from routers import (
    tasks as tasks_router,
    habits as habits_router,
    pomodoro as pomodoro_router,
    goals as goals_router,
    journal as journal_router,
    auth as auth_router,
)

# Explicitly load the .env file to ensure configuration is always read.
load_dotenv()

# Force all output streams to use UTF-8 encoding.
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

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


app.add_middleware(CorrelationIdMiddleware)

app.include_router(auth_router.router)
app.include_router(tasks_router.router)
app.include_router(habits_router.router)
app.include_router(pomodoro_router.router)
app.include_router(goals_router.router)
app.include_router(journal_router.router)


def parse_origins(value: Optional[str]) -> List[str]:
    if not value:
        return ["http://localhost:3000"]
    return [p.strip() for p in value.split(",") if p.strip()] or [
        "http://localhost:3000"
    ]


allowed_origins = parse_origins(os.getenv("ALLOWED_ORIGINS"))
logging.info(f"CORS allow_origins={allowed_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI client implementations live in apps/api-py/services/ai_clients.py


@app.post("/api/v1/process-audio")
async def process_audio_pipeline(request: Request, audio_file: UploadFile = File(...)):
    """
    Stream agent events and final response as NDJSON lines.
    Protocol:
      {"type": "thought", "content": "..."}
      {"type": "tool_use", "tool": "...", "input": "..."}
      {"type": "response", "content": "..."}
      {"type": "error", "content": "..."}
    """
    # Local imports to avoid module-level imports that depend on env/config
    from services.ai_clients import _get_transcription, _get_llm_response
    from agent import graph as agent_graph

    audio_bytes = await audio_file.read()
    transcribed_text = await _get_transcription(audio_bytes)

    if not transcribed_text or not transcribed_text.strip():
        # Immediate short-circuit response as NDJSON
        async def empty_stream() -> AsyncGenerator[bytes, None]:
            yield (json.dumps({"type": "response", "content": "I didn't catch that."}) + "\n").encode()

        return StreamingResponse(empty_stream(), media_type="application/x-ndjson")

    async def event_stream() -> AsyncGenerator[bytes, None]:
        try:
            # Emit an immediate thought after STT to reduce perceived latency
            yield (json.dumps({"type": "thought", "content": "Processing…"}) + "\n").encode()

            # If agent runtime or streaming API not available, fall back to linear LLM
            if not getattr(agent_graph, "agent_app", None) or not hasattr(agent_graph.agent_app, "astream_events"):
                llm_result = await _get_llm_response(transcribed_text)
                final_text = (
                    llm_result.get("reply")
                    or llm_result.get("output")
                    or llm_result.get("text")
                    or str(llm_result)
                )
                yield (json.dumps({"type": "response", "content": final_text}) + "\n").encode()
                yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()
                return

            # Stream events from agent.graph.agent_app.astream_events(...) (async generator)
            # We use version="v1" to get standard LangChain event shapes
            async for ev in agent_graph.agent_app.astream_events(
                {"input": transcribed_text}, version="v1"
            ):
                # If client disconnected, stop streaming promptly
                try:
                    if await request.is_disconnected():
                        yield (json.dumps({"type": "end", "content": "canceled"}) + "\n").encode()
                        return
                except Exception:
                    # If disconnect check fails, continue best-effort
                    pass
                # Normalize event access defensively
                if ev is None:
                    continue
                
                kind = ev.get("event")
                
                # High-level chain/model starts -> emit lightweight thoughts for transparency
                if kind == "on_chain_start":
                    name = ev.get("name") or "chain"
                    if name and name != "LangGraph":
                        yield (json.dumps({
                            "type": "thought",
                            "content": f"Starting {name}…",
                        }) + "\n").encode()
                        continue

                if kind == "on_chat_model_start":
                    yield (json.dumps({
                        "type": "thought",
                        "content": "Formulating response…",
                    }) + "\n").encode()
                    continue

                # Tool Usage -> "tool_use"
                if kind == "on_tool_start":
                    tool_name = ev.get("name", "unknown")
                    # data.input might be a dict or string
                    tool_input = str(ev.get("data", {}).get("input", ""))
                    yield (json.dumps({
                        "type": "tool_use", 
                        "tool": tool_name, 
                        "input": tool_input
                    }) + "\n").encode()
                    continue

                # Chat Model Stream -> Optional thought tokens (omitted to avoid spam)
                # If desired, we could aggregate tokens and emit periodic thoughts.

                # Final Result -> "response"
                # LangGraph 'on_chain_end' for the root graph usually contains the final output
                if kind == "on_chain_end" and ev.get("name") == "LangGraph":
                    output = ev.get("data", {}).get("output")
                    if output:
                        # Extract the final response from the agent state
                        # Adjust key based on your graph's output schema (usually 'messages' or 'output')
                        content = None
                        if isinstance(output, dict):
                            # If output is a dict with 'messages', get the last AI message
                            if "messages" in output and isinstance(output["messages"], list):
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
                            yield (json.dumps({"type": "response", "content": str(content)}) + "\n").encode()
                            # Optional: emit an end-of-stream marker for downstream clarity
                            yield (json.dumps({"type": "end", "content": "done"}) + "\n").encode()

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
        ollama_client,
        stt_model,
        STT_URL,
        LLM_URL,
        GROQ_API_KEY,
        DEEPGRAM_API_KEY,
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
        raise HTTPException(status_code=502, detail=f"TTS service error: {e}")
