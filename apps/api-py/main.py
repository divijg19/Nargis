import io
import soundfile as sf
import subprocess
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

# --- AI Model Setup ---
# Use the multilingual model for compatibility with language/task flags
stt_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")

# --- FastAPI App Setup ---
app = FastAPI(title="Nargis AI Service")

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Audio Conversion Helper ---
def convert_audio_to_wav(audio_bytes: bytes) -> bytes:
    print("Converting audio with FFmpeg...")
    try:
        command = [
            'ffmpeg',
            '-i', 'pipe:0',
            '-f', 'wav',
            '-ar', '16000',
            '-ac', '1',
            'pipe:1'
        ]
        process = subprocess.run(
            command,
            input=audio_bytes,
            capture_output=True,
            check=True
        )
        print("FFmpeg conversion successful.")
        return process.stdout
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        raise
    except FileNotFoundError:
        print("FFmpeg not found. Please ensure it is installed and in your system's PATH.")
        raise

# --- API Endpoints ---
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    audio_bytes = await audio_file.read()

    try:
        wav_audio_bytes = convert_audio_to_wav(audio_bytes)
    except Exception as e:
        return {"error": f"Failed to convert audio: {e}"}

    waveform, sample_rate = sf.read(io.BytesIO(wav_audio_bytes))
    
    # --- THIS IS THE CORRECT, STABLE CALL ---
    result = stt_pipeline(
        {"raw": waveform, "sampling_rate": sample_rate},
        return_timestamps=True,  # CRITICAL: Fixes the >30s ValueError crash
        generate_kwargs={        # RECOMMENDED: Fixes the 'task' deprecation warning
            "task": "transcribe",
        }
    )
    
    transcribed_text = result["text"]
    print(f"Transcription complete: '{transcribed_text}'")
    return {"text": transcribed_text}