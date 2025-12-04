import os
import asyncio
import json
import sys
import types
import importlib

# Ensure ML_WORKER_URL is set
os.environ["ML_WORKER_URL"] = "http://ml-worker:8001"


# Create dummy httpx.AsyncClient replacement
class DummyResp:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self._data


class DummyClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, *args, **kwargs):
        if url.endswith("/stt"):
            return DummyResp({"text": "hello world"})
        if url.endswith("/llm"):
            return DummyResp({"reply": "Echo: test"})
        return DummyResp({})


# Some heavy dependencies may not be installed in this environment (soundfile, openai, httpx).
# Insert lightweight stubs into sys.modules so the module can import successfully.
if "soundfile" not in sys.modules:
    sys.modules["soundfile"] = types.ModuleType("soundfile")

    # Provide a minimal read function placeholder
    def _sf_read(f):
        return ([], 16000)

    sys.modules["soundfile"].read = _sf_read

if "openai" not in sys.modules:
    openai_mod = types.ModuleType("openai")

    class OpenAI:
        def __init__(self, *args, **kwargs):
            pass

    openai_mod.OpenAI = OpenAI
    sys.modules["openai"] = openai_mod

if "httpx" not in sys.modules:
    httpx_mod = types.ModuleType("httpx")

    # provide a placeholder AsyncClient class which we'll override below
    class _AsyncClientPlaceholder:
        def __init__(self, *args, **kwargs):
            pass

    httpx_mod.AsyncClient = _AsyncClientPlaceholder
    sys.modules["httpx"] = httpx_mod

if "fastapi" not in sys.modules:
    fastapi_mod = types.ModuleType("fastapi")

    class HTTPException(Exception):
        def __init__(self, status_code=None, detail=None):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    fastapi_mod.HTTPException = HTTPException
    sys.modules["fastapi"] = fastapi_mod

ai_clients = importlib.import_module("services.ai_clients")
# Override the AsyncClient on the imported module with our DummyClient
ai_clients.httpx.AsyncClient = DummyClient


async def main():
    t = await ai_clients._get_transcription(b"fake")
    print("transcription:", t)
    llm = await ai_clients._get_llm_response("say hello")
    print("llm response:", json.dumps(llm))


if __name__ == "__main__":
    asyncio.run(main())
