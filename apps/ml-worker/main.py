from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel

app = FastAPI(title="Nargis ML Worker")


class LLMRequest(BaseModel):
    text: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/stt")
async def stt(audio: UploadFile = File(...)):
    # Placeholder: integrate whisper.cpp or whisperx here
    await audio.read()
    return {"text": "(transcription placeholder)"}


@app.post("/llm")
async def llm(req: LLMRequest):
    # Placeholder: integrate Ollama / local LLM runtime here
    return {"text": f"Echo: {req.text}"}


@app.post("/tts")
async def tts(req: LLMRequest):
    # Placeholder: integrate Coqui or Piper to return audio bytes
    return {"message": "Not implemented"}
