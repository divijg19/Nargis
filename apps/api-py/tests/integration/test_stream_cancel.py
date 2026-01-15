import json

import pytest
from httpx import ASGITransport, AsyncClient

import services.ai_clients
from main import app


@pytest.mark.asyncio
async def test_process_audio_stream_basic(monkeypatch, token):
    async def mock_get_transcription(audio_bytes):
        return "Hello world"

    monkeypatch.setattr(
        services.ai_clients, "_get_transcription", mock_get_transcription
    )

    async def mock_get_llm_response(text: str):
        return {"text": "Hi from chat mode"}

    monkeypatch.setattr(services.ai_clients, "_get_llm_response", mock_get_llm_response)

    # Use ASGI app with AsyncClient to test NDJSON streaming
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"audio_file": ("sample.wav", b"fake-bytes", "audio/wav")}
        resp = await client.post("/api/v1/process-audio", files=files, headers=headers)
        assert resp.status_code == 200
        assert resp.headers.get("content-type", "").startswith("application/x-ndjson")

        # Response is fully buffered by AsyncClient; parse lines
        lines = [line for line in resp.text.splitlines() if line.strip()]
        types = [json.loads(line).get("type") for line in lines]
        assert "transcript" in types
        assert "response" in types
        assert "end" in types


@pytest.mark.asyncio
async def test_process_audio_stream_end_marker_present(monkeypatch, token):
    async def mock_get_transcription(audio_bytes):
        return "Hello world"

    monkeypatch.setattr(
        services.ai_clients, "_get_transcription", mock_get_transcription
    )

    async def mock_get_llm_response(text: str):
        return {"text": "Ok"}

    monkeypatch.setattr(services.ai_clients, "_get_llm_response", mock_get_llm_response)

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"audio_file": ("sample.wav", b"fake-bytes", "audio/wav")}
        resp = await client.post("/api/v1/process-audio", files=files, headers=headers)
        assert resp.status_code == 200
        lines = [line for line in resp.text.splitlines() if line.strip()]
        # Ensure an end marker is present in typical flows (done or after response)
        types = [json.loads(line).get("type") for line in lines]
        assert "response" in types or "error" in types
        assert "end" in types or "error" in types


@pytest.mark.asyncio
async def test_process_audio_agent_mode_requires_auth(monkeypatch):
    async def mock_get_transcription(audio_bytes):
        return "Hello world"

    monkeypatch.setattr(
        services.ai_clients, "_get_transcription", mock_get_transcription
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"audio_file": ("sample.wav", b"fake-bytes", "audio/wav")}
        resp = await client.post("/api/v1/process-audio?mode=agent", files=files)
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_process_audio_allows_anonymous(monkeypatch):
    # For anonymous users, the endpoint should not 401 and should include an end marker.
    async def mock_get_transcription(audio_bytes):
        return ""

    monkeypatch.setattr(
        services.ai_clients, "_get_transcription", mock_get_transcription
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"audio_file": ("sample.wav", b"fake-bytes", "audio/wav")}
        resp = await client.post("/api/v1/process-audio", files=files)
        assert resp.status_code == 200
        lines = [line for line in resp.text.splitlines() if line.strip()]
        types = [json.loads(line).get("type") for line in lines]
        assert "end" in types or "error" in types
