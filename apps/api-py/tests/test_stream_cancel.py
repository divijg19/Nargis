import json
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_process_audio_stream_basic():
    # Use ASGI app with AsyncClient to test NDJSON streaming
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"audio_file": ("sample.wav", b"fake-bytes", "audio/wav")}
        resp = await client.post("/api/v1/process-audio", files=files)
        assert resp.status_code == 200
        assert resp.headers.get("content-type", "").startswith("application/x-ndjson")

        # Response is fully buffered by AsyncClient; parse lines
        lines = [line for line in resp.text.splitlines() if line.strip()]
        assert len(lines) >= 1
        # First line may be a thought
        evt0 = json.loads(lines[0])
        assert "type" in evt0


@pytest.mark.asyncio
async def test_process_audio_stream_end_marker_present():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"audio_file": ("sample.wav", b"fake-bytes", "audio/wav")}
        resp = await client.post("/api/v1/process-audio", files=files)
        assert resp.status_code == 200
        lines = [line for line in resp.text.splitlines() if line.strip()]
        # Ensure an end marker is present in typical flows (done or after response)
        types = [json.loads(line).get("type") for line in lines]
        assert "response" in types or "error" in types
        assert "end" in types or "error" in types
