# /apps/api-py/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Nargis AI Service")

# CORS configuration
origins = [
    "http://localhost:3000", # The URL of your Next.js app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/echo/{text}")
def echo(text: str):
    return {"echo": text}