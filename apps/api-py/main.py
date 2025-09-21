import io
import logging
import soundfile as sf
import subprocess
import asyncio
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from openai import OpenAI

# Configure logging for better Developer Experience (DX)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

# --- AI Model & API Client Setup ---

# Initialize the OpenAI client to point to your local Ollama server.
try:
    ollama_client = OpenAI(
        base_url='http://localhost:11434/v1',
        api_key='ollama',  # Required by the library, but can be any string for Ollama
    )
    logging.info("Local Ollama client initialized successfully.")
except Exception as e:
    logging.warning(f"Failed to initialize Ollama client. Is Ollama running? Error: {e}")
    ollama_client = None

# Initialize the STT pipeline with the latest, most optimal configuration for CPU.
# By removing manual dtype/device overrides, we allow the Transformers library
# to apply the best available performance strategies for your hardware.
logging.info("Loading STT model with automatic CPU optimizations...")
stt_pipeline = pipeline(
    "automatic-speech-recognition",
    model="distil-whisper/distil-large-v3",
    # The chunking strategy is the key to handling long audio robustly without freezing.
    chunk_length_s=30,
    stride_length_s=5,
)
logging.info("STT model loaded successfully.")

# --- FastAPI App & Data Models ---
app = FastAPI(title="Nargis AI Service")

class LLMRequest(BaseModel):
    text: str

# --- Middleware (CORS) ---
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Synchronous, CPU-Bound Helper Functions ---
# These functions contain heavy work and are designed to be run in a separate thread pool.

def convert_audio_to_wav_sync(audio_bytes: bytes) -> bytes:
    print("Converting audio with FFmpeg...")
    try:
        command = [
            'ffmpeg',
            '-i', 'pipe:0',      # Read from standard input
            '-f', 'wav',         # Output format is WAV
            '-ar', '16000',      # Resample to 16kHz audio rate
            '-ac', '1',          # Convert to single-channel (mono)
            'pipe:1'             # Write to standard output
        ]
        process = subprocess.run(
            command,
            input=audio_bytes,
            capture_output=True,
            check=True # Raise an exception if FFmpeg fails
        )
        print("FFmpeg conversion successful.")
        return process.stdout
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        raise
    except FileNotFoundError:
        print("FFmpeg not found. Please ensure it is installed and in your system's PATH.")
        raise

def run_stt_pipeline_sync(wav_audio_bytes: bytes) -> str:
    print("Running STT pipeline with chunking...")
    waveform, sample_rate = sf.read(io.BytesIO(wav_audio_bytes))
    result = stt_pipeline({"raw": waveform, "sampling_rate": sample_rate})
    transcribed_text = result["text"]
    print(f"Transcription complete: '{transcribed_text}'")
    return transcribed_text

def run_llm_sync(text: str) -> dict:
    if not ollama_client:
        return {"error": "Ollama client is not initialized."}
    
    print(f"Received for Local LLM: '{text}'")
    try:
        chat_completion = ollama_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are Nargis, a friendly and concise AI productivity assistant."},
                {"role": "user", "content": text},
            ],
            model="phi3:instruct",
        )
        response_text = chat_completion.choices[0].message.content
        print(f"Local LLM Response: '{response_text}'")
        return {"text": response_text}
    except Exception as e:
        print(f"An error occurred with the Ollama API: {e}")
        return {"error": str(e)}

# --- API Endpoints ---
# These endpoints are fully asynchronous to keep the server responsive.

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    # Asynchronously read the file data. This is non-blocking I/O.
    audio_bytes = await audio_file.read()
    
    loop = asyncio.get_running_loop()
    try:
        # Run the synchronous, blocking functions in a separate thread pool.
        wav_audio_bytes = await loop.run_in_executor(None, convert_audio_to_wav_sync, audio_bytes)
        transcribed_text = await loop.run_in_executor(None, run_stt_pipeline_sync, wav_audio_bytes)
        return {"text": transcribed_text}
    except Exception as e:
        return {"error": str(e)}

@app.post("/llm")
async def process_llm(request: LLMRequest):
    loop = asyncio.get_running_loop()
    try:
        # Run the synchronous Ollama call in the thread pool.
        response_data = await loop.run_in_executor(None, run_llm_sync, request.text)
        return response_data
    except Exception as e:
        return {"error": str(e)}