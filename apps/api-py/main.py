from fastapi import FastAPI

app = FastAPI(title="Nargis AI Service")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/echo/{text}")
def echo(text: str):
    return {"echo": text}
