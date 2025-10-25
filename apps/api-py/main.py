import io
import logging
import soundfile as sf
import subprocess
import asyncio
import sys
import os
import uuid
from typing import Optional, List
from contextvars import ContextVar
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from dotenv import load_dotenv

# Explicitly load the .env file to ensure configuration is always read.
load_dotenv()

# Force all output streams to use UTF-8 encoding.
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

# THIS IS THE LOGGING FIX: It safely handles logs from external libraries.
class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, 'request_id'):
            record.request_id = request_id_ctx.get("-")
        return True

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s %(levelname)s request_id=%(request_id)s %(message)s'
)
logging.getLogger().addFilter(RequestIdFilter())

# Ensure every LogRecord has a request_id attribute even if some handlers or
# libraries bypass filters — wrap the LogRecord factory to inject a default.
_orig_record_factory = logging.getLogRecordFactory()
def _record_factory(*args, **kwargs):
    record = _orig_record_factory(*args, **kwargs)
    if not hasattr(record, 'request_id'):
        try:
            record.request_id = request_id_ctx.get("-")
        except Exception:
            record.request_id = "-"
    return record
logging.setLogRecordFactory(_record_factory)

from services.ai_clients import (
    ensure_stt_loaded,
    _get_transcription,
    _get_llm_response,
    ollama_client,
    stt_model,
    STT_URL,
    LLM_URL,
    GROQ_API_KEY,
    DEEPGRAM_API_KEY,
    HTTP_TIMEOUT,
)

app = FastAPI(title="Nargis AI Service")

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

from routers import tasks as tasks_router, habits as habits_router, pomodoro as pomodoro_router

app.include_router(tasks_router.router)
app.include_router(habits_router.router)
app.include_router(pomodoro_router.router)

def parse_origins(value: Optional[str]) -> List[str]:
    if not value: return ["http://localhost:3000"]
    return [p.strip() for p in value.split(",") if p.strip()] or ["http://localhost:3000"]

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
async def process_audio_pipeline(audio_file: UploadFile = File(...)):
    try:
        audio_bytes = await audio_file.read()
        transcribed_text = await _get_transcription(audio_bytes)
        
        if not transcribed_text or not transcribed_text.strip():
            return {"choices": [{"message": {"content": "I'm sorry, I didn't catch that. Could you please repeat?"}}]}

        # Call the LLM and return both the transcript and the model response so
        # the frontend can show the user's transcript immediately and then the AI response.
        llm_result = await _get_llm_response(transcribed_text)
        return {"transcript": transcribed_text, "llm": llm_result}

    except httpx.HTTPStatusError as e:
        logging.exception(f"HTTP error: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Error from external AI service: {e.response.text}")
    except Exception as e:
        logging.exception("Error during audio processing.")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health(): return {"status": "ok"}

@app.get("/ready")
async def ready():
    return {
        "status": "ready" if (ollama_client or (LLM_URL and GROQ_API_KEY)) else "degraded",
        "sttLoaded": stt_model is not None,
        "ollamaClient": ollama_client is not None,
        "sttExternalConfigured": bool(STT_URL and DEEPGRAM_API_KEY),
        "llmExternalConfigured": bool(LLM_URL and GROQ_API_KEY),
    }

@app.on_event("startup")
async def maybe_preload():
    if os.getenv("PRELOAD_STT", "false").lower() == "true":
        await ensure_stt_loaded()

class TTSRequest(BaseModel):
    text: str

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    if not TTS_URL or not TTS_API_KEY: raise HTTPException(status_code=501, detail="TTS not configured")
    try:
        headers = {"Authorization": f"Bearer {TTS_API_KEY}"}
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(TTS_URL, json={"text": req.text}, headers=headers)
            resp.raise_for_status()
            return Response(content=resp.content, media_type=resp.headers.get("content-type", "audio/mpeg"))
    except Exception as e:
        logging.exception("TTS proxy failed")
        raise HTTPException(status_code=502, detail=f"TTS service error: {e}")