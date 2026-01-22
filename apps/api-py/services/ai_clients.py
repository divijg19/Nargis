import asyncio
import io
import logging
import os
import subprocess
from typing import TYPE_CHECKING

import httpx
import soundfile as sf
from fastapi import HTTPException
from openai import OpenAI

if TYPE_CHECKING:
    pass

# Read configuration from environment variables (defaults preserve previous behavior)
STT_URL = os.getenv("STT_URL", "")
LLM_URL = os.getenv("LLM_URL", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
HTTP_TIMEOUT = int(os.getenv("HTTP_TIMEOUT_SECONDS", "60"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi-3-mini")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
ML_WORKER_URL = os.getenv("ML_WORKER_URL", "")
# New flag: ENABLE_LOCAL_STT enables local Whisper-based STT when set to "1".
# Default is disabled in production.
ENABLE_LOCAL_STT = os.getenv("ENABLE_LOCAL_STT", "0") == "1"

# Local STT model state
device = "cpu"
stt_processor = None
stt_model = None
_stt_lock = asyncio.Lock()

# Initialize local Ollama client if available
try:
    ollama_client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
    logging.info("Local Ollama client initialized successfully.")
except Exception as e:
    logging.warning(
        f"Failed to initialize Ollama client. Is Ollama running? Error: {e}"
    )
    ollama_client = None


async def ensure_stt_loaded():
    global stt_processor, stt_model
    if stt_model is not None:
        return
    async with _stt_lock:
        if stt_model is not None:
            return
        logging.info("Lazy loading Whisper STT model...")
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

        stt_processor = AutoProcessor.from_pretrained("openai/whisper-base")
        stt_model = AutoModelForSpeechSeq2Seq.from_pretrained("openai/whisper-base")
        stt_model.to(device)
        logging.info("STT model ready.")


def convert_audio_to_wav_sync(audio_bytes: bytes) -> bytes:
    logging.info("Converting audio with FFmpeg...")
    try:
        command = [
            "ffmpeg",
            "-i",
            "pipe:0",
            "-f",
            "wav",
            "-ar",
            "16000",
            "-ac",
            "1",
            "pipe:1",
        ]
        process = subprocess.run(
            command, input=audio_bytes, capture_output=True, check=True
        )
        return process.stdout
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error: {e.stderr.decode('utf-8')}")
        raise


def run_stt_inference_sync(wav_audio_bytes: bytes) -> str:
    logging.info("Running STT inference with local model...")
    assert stt_processor is not None and stt_model is not None, "STT model not loaded"
    waveform, _ = sf.read(io.BytesIO(wav_audio_bytes))
    inputs = stt_processor(waveform, sampling_rate=16000, return_tensors="pt")
    input_features = inputs.input_features.to(device)
    predicted_ids = stt_model.generate(input_features)
    transcription = stt_processor.batch_decode(predicted_ids, skip_special_tokens=True)[
        0
    ]
    return transcription


def run_llm_sync(text: str) -> dict:
    if not ollama_client:
        return {"error": "Ollama client is not initialized."}
    logging.info(f"Received for Local LLM: '{text}'")
    try:
        chat_completion = ollama_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are Nargis, a friendly AI assistant.",
                },
                {"role": "user", "content": text},
            ],
            model=OLLAMA_MODEL,
        )
        return chat_completion.model_dump()
    except Exception as e:
        logging.error(f"An error occurred with the Ollama API: {e}")
        return {"error": str(e)}


async def _get_transcription(audio_bytes: bytes) -> str:
    # Log basic info about the incoming audio for observability (can be removed later)
    try:
        logging.info(
            "STT input",
            extra={"bytes": len(audio_bytes), "head": audio_bytes[:8].hex()},
        )
    except Exception:
        logging.debug("Failed to log STT input head")

    # Decision order (production-safe):
    # 1) If Deepgram is configured -> use Deepgram
    # 2) Else if ENABLE_LOCAL_STT -> use local Whisper
    # 3) Else -> raise error

    # 1) Deepgram
    if STT_URL and DEEPGRAM_API_KEY:
        logging.info("Using external STT provider: Deepgram")
        try:
            params = {
                # ensure correct decoding on Deepgram side
                "encoding": "opus",
                "container": "webm",
                "punctuate": "true",
                "smart_format": "true",
            }
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "audio/webm",
            }
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.post(
                    STT_URL, headers=headers, params=params, content=audio_bytes
                )
                resp.raise_for_status()
                data = resp.json()
                # Deepgram shape: results.channels[0].alternatives[0].transcript
                transcript = (
                    data.get("results", {})
                    .get("channels", [{}])[0]
                    .get("alternatives", [{}])[0]
                    .get("transcript", "")
                )
                if not transcript:
                    # Empty transcripts are errors in production
                    logging.error("Deepgram returned empty transcript")
                    raise HTTPException(
                        status_code=502, detail="STT returned empty transcript"
                    )
                return transcript
        except HTTPException:
            raise
        except Exception as e:
            logging.exception(f"Deepgram STT failed: {e}")
            # Do not silently fall back; surface the error to caller
            raise

    # If an ML worker is available, prefer delegating to it (isolates heavy deps)
    if ML_WORKER_URL:
        logging.info(f"Delegating STT to ML worker at {ML_WORKER_URL}")
        stt_url = ML_WORKER_URL.rstrip("/") + "/stt"
        try:
            headers = {"Content-Type": "audio/webm"}
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.post(stt_url, headers=headers, content=audio_bytes)
                resp.raise_for_status()
                data = resp.json()
                # ML worker expected to return {"text": "..."}
                text = data.get("text", "")
                if not text:
                    logging.error("ML worker returned empty transcript")
                    raise HTTPException(
                        status_code=502,
                        detail="STT returned empty transcript from ML worker",
                    )
                return text
        except HTTPException:
            raise
        except Exception as e:
            logging.exception(f"Error delegating STT to ML worker: {e}")
            raise

    # 2) Local STT if explicitly enabled
    if ENABLE_LOCAL_STT:
        logging.info("Using local STT model.")
        await ensure_stt_loaded()
        loop = asyncio.get_running_loop()
        try:
            wav_audio_bytes = await loop.run_in_executor(
                None, convert_audio_to_wav_sync, audio_bytes
            )
            return await loop.run_in_executor(
                None, run_stt_inference_sync, wav_audio_bytes
            )
        except Exception as e:
            logging.exception(f"Local STT failed: {e}")
            raise HTTPException(status_code=500, detail="Local STT failed") from e

    # 3) No STT backend available
    logging.error("No STT backend available: neither Deepgram nor local STT enabled")
    raise HTTPException(status_code=503, detail="No STT backend available")


async def _get_llm_response(text: str) -> dict:
    # Prefer external LLM provider if configured
    if LLM_URL and GROQ_API_KEY:
        logging.info("Using external LLM provider: Groq")
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Nargis, a friendly and concise "
                        "AI productivity assistant."
                    ),
                },
                {"role": "user", "content": text},
            ],
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
        }
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(LLM_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    # If ML worker is available, delegate LLM requests to it
    if ML_WORKER_URL:
        logging.info(f"Delegating LLM to ML worker at {ML_WORKER_URL}")
        llm_url = ML_WORKER_URL.rstrip("/") + "/llm"
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.post(llm_url, json={"text": text})
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logging.exception(f"Error delegating LLM to ML worker: {e}")

    logging.info("Using local LLM (Ollama).")
    if not ollama_client:
        raise HTTPException(
            status_code=503, detail="Local LLM client is not initialized."
        )
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, run_llm_sync, text)


def get_embedding(text: str) -> list[float]:
    """Return an embedding vector for the given text.

    Tries providers in order: OpenAI -> sentence-transformers local model.
    Raises RuntimeError if no provider is available.
    """
    # Try OpenAI (synchronous client usage)
    try:
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        resp = client.embeddings.create(model=model, input=text)
        return list(resp.data[0].embedding)
    except Exception:
        # Fall back to sentence-transformers if available
        try:
            from sentence_transformers import SentenceTransformer

            model_name = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
            model = SentenceTransformer(model_name)
            vec = model.encode(text)
            return vec.tolist()
        except Exception:
            raise RuntimeError(
                "No embedding provider available. "
                "Install OpenAI SDK or sentence-transformers."
            ) from None
