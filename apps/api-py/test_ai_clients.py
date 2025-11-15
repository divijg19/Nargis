import asyncio
import os

import pytest


@pytest.mark.asyncio
async def test_get_transcription_delegates_to_ml_worker(monkeypatch):
    # Arrange: set ML_WORKER_URL and patch httpx.AsyncClient to a dummy client
    monkeypatch.setenv("ML_WORKER_URL", "http://ml-worker:8001")

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
            # Respond with expected ML worker stt shape
            if url.endswith("/stt"):
                return DummyResp({"text": "hello world"})
            return DummyResp({})

    monkeypatch.setattr("httpx.AsyncClient", DummyClient)

    # Import under test after monkeypatching httpx
    from services.ai_clients import _get_transcription

    # Act
    text = await _get_transcription(b"fake-audio-bytes")

    # Assert
    assert isinstance(text, str)
    assert "hello" in text.lower()


@pytest.mark.asyncio
async def test_get_llm_delegates_to_ml_worker(monkeypatch):
    # Arrange
    monkeypatch.setenv("ML_WORKER_URL", "http://ml-worker:8001")

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
            if url.endswith("/llm"):
                return DummyResp({"reply": "Echo: test"})
            return DummyResp({})

    monkeypatch.setattr("httpx.AsyncClient", DummyClient)

    from services.ai_clients import _get_llm_response

    # Act
    resp = await _get_llm_response("say hello")

    # Assert
    assert isinstance(resp, dict)
