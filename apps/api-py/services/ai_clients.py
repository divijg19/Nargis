import io
import logging
import soundfile as sf
import subprocess
import asyncio
import os
import uuid
from typing import Optional
from contextvars import ContextVar
import httpx
from openai import OpenAI
from fastapi import HTTPException

# Read configuration from environment variables (defaults preserve previous behavior)
STT_URL = os.getenv("STT_URL", "")
LLM_URL = os.getenv("LLM_URL", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
HTTP_TIMEOUT = int(os.getenv("HTTP_TIMEOUT_SECONDS", "60"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi-3-mini")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# Local STT model state
device = "cpu"
stt_processor = None
stt_model = None
_stt_lock = asyncio.Lock()

# Initialize local Ollama client if available
try:
    ollama_client = OpenAI(base_url='http://localhost:11434/v1', api_key='ollama')
    logging.info("Local Ollama client initialized successfully.")
except Exception as e:
    logging.warning(f"Failed to initialize Ollama client. Is Ollama running? Error: {e}")
    ollama_client = None

async def ensure_stt_loaded():
    global stt_processor, stt_model
    if stt_model is not None:
        return
    async with _stt_lock:
        if stt_model is not None:
            return
        logging.info("Lazy loading Whisper STT model...")
        from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
        stt_processor = AutoProcessor.from_pretrained("openai/whisper-base")
        stt_model = AutoModelForSpeechSeq2Seq.from_pretrained("openai/whisper-base")
        stt_model.to(device)
        logging.info("STT model ready.")

def convert_audio_to_wav_sync(audio_bytes: bytes) -> bytes:
    logging.info("Converting audio with FFmpeg...")
    try:
        command = [ 'ffmpeg', '-i', 'pipe:0', '-f', 'wav', '-ar', '16000', '-ac', '1', 'pipe:1' ]
        process = subprocess.run(command, input=audio_bytes, capture_output=True, check=True)
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
    transcription = stt_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    return transcription


def run_llm_sync(text: str) -> dict:
    if not ollama_client:
        return {"error": "Ollama client is not initialized."}
    logging.info(f"Received for Local LLM: '{text}'")
    try:
        chat_completion = ollama_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are Nargis, a friendly AI assistant."},
                {"role": "user", "content": text},
            ],
            model=OLLAMA_MODEL,
        )
        return chat_completion.model_dump()
    except Exception as e:
        logging.error(f"An error occurred with the Ollama API: {e}")
        return {"error": str(e)}


async def _get_transcription(audio_bytes: bytes) -> str:
    # Prefer external STT provider if configured
    if STT_URL and DEEPGRAM_API_KEY:
        logging.info("Using external STT provider: Deepgram")
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
            headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}
            resp = await client.post(STT_URL, headers=headers, files=files)
            resp.raise_for_status()
            return resp.json()["results"]["channels"][0]["alternatives"][0]["transcript"]

    logging.info("Using local STT model.")
    await ensure_stt_loaded()
    loop = asyncio.get_running_loop()
    wav_audio_bytes = await loop.run_in_executor(None, convert_audio_to_wav_sync, audio_bytes)
    return await loop.run_in_executor(None, run_stt_inference_sync, wav_audio_bytes)


async def _get_llm_response(text: str) -> dict:
    # Prefer external LLM provider if configured
    if LLM_URL and GROQ_API_KEY:
        logging.info("Using external LLM provider: Groq")
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You are Nargis, a friendly and concise AI productivity assistant."},
                {"role": "user", "content": text}
            ]
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}"
        }
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(LLM_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    logging.info("Using local LLM (Ollama).")
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Local LLM client is not initialized.")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, run_llm_sync, text)
