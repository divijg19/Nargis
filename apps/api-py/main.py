import io
import logging
import soundfile as sf
import subprocess
import asyncio
import sys
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from openai import OpenAI

# Force all output streams to use UTF-8 encoding to prevent 'charmap' errors on Windows.
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

# Configure logging for better Developer Experience (DX)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

# --- AI Model & API Client Setup ---
try:
    ollama_client = OpenAI(base_url='http://localhost:11434/v1', api_key='ollama')
    logging.info("Local Ollama client initialized successfully.")
except Exception as e:
    logging.warning(f"Failed to initialize Ollama client. Is Ollama running? Error: {e}")
    ollama_client = None

logging.info("Loading STT model and processor (stable CPU configuration)...")
device = "cpu"
stt_processor = AutoProcessor.from_pretrained("openai/whisper-base")
stt_model = AutoModelForSpeechSeq2Seq.from_pretrained("openai/whisper-base")
stt_model.to(device)
logging.info("STT model and processor loaded successfully.")

# --- FastAPI App & Data Models ---
app = FastAPI(title="Nargis AI Service")
class LLMRequest(BaseModel):
    text: str

# --- Middleware (CORS) ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- CPU-Bound Helper Functions ---
def convert_audio_to_wav_sync(audio_bytes: bytes) -> bytes:
    logging.info("Converting audio with FFmpeg...")
    try:
        command = [ 'ffmpeg', '-i', 'pipe:0', '-f', 'wav', '-ar', '16000', '-ac', '1', 'pipe:1' ]
        process = subprocess.run(command, input=audio_bytes, capture_output=True, check=True)
        logging.info("FFmpeg conversion successful.")
        return process.stdout
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error: {e.stderr.decode('utf-8')}")
        raise
    except Exception as e:
        logging.error(f"An unexpected error occurred during FFmpeg conversion: {e}")
        raise

def run_stt_inference_sync(wav_audio_bytes: bytes) -> str:
    logging.info("Running STT inference with model.generate()...")
    waveform, sample_rate = sf.read(io.BytesIO(wav_audio_bytes))
    
    inputs = stt_processor(
        waveform, 
        sampling_rate=sample_rate, 
        return_tensors="pt"
    )
    input_features = inputs.input_features.to(device)
    attention_mask = inputs.get("attention_mask")
    if attention_mask is not None:
        attention_mask = attention_mask.to(device)

    # We provide the model with explicit instructions on its task and language.
    forced_decoder_ids = stt_processor.get_decoder_prompt_ids(language="english", task="transcribe")

    predicted_ids = stt_model.generate(
        input_features,
        attention_mask=attention_mask,
        forced_decoder_ids=forced_decoder_ids
    )

    transcription = stt_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    
    logging.info(f"Transcription complete: '{transcription}'")
    return transcription

def run_llm_sync(text: str) -> dict:
    if not ollama_client:
        return {"error": "Ollama client is not initialized."}
    logging.info(f"Received for Local LLM: '{text}'")
    try:
        chat_completion = ollama_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are Nargis, a friendly and concise AI productivity assistant."},
                {"role": "user", "content": text},
            ],
            # Use the correct, non-hyphenated model name for Ollama.
            model="phi4-mini",
        )
        response_text = chat_completion.choices[0].message.content
        logging.info(f"Local LLM Response: '{response_text}'")
        return {"text": response_text}
    except Exception as e:
        logging.error(f"An error occurred with the Ollama API: {e}")
        return {"error": str(e)}

# --- API Endpoints ---
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    audio_bytes = await audio_file.read()
    loop = asyncio.get_running_loop()
    try:
        wav_audio_bytes = await loop.run_in_executor(None, convert_audio_to_wav_sync, audio_bytes)
        transcribed_text = await loop.run_in_executor(None, run_stt_inference_sync, wav_audio_bytes)
        return {"text": transcribed_text}
    except Exception as e:
        return {"error": str(e)}

@app.post("/llm")
async def process_llm(request: LLMRequest):
    loop = asyncio.get_running_loop()
    try:
        response_data = await loop.run_in_executor(None, run_llm_sync, request.text)
        return response_data
    except Exception as e:
        return {"error": str(e)}