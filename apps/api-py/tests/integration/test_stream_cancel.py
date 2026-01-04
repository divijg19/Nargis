import json

import pytest
from httpx import ASGITransport, AsyncClient

import agent.graph
import services.ai_clients
from main import app


@pytest.mark.asyncio
async def test_process_audio_stream_basic(monkeypatch, token):
    async def mock_get_transcription(audio_bytes):
        return "Hello world"

    monkeypatch.setattr(
        services.ai_clients, "_get_transcription", mock_get_transcription
    )

    # Mock Agent App to avoid real LLM calls and ensure deterministic output
    class MockAgentApp:
        async def astream_events(self, inputs, version):
            # Simulate a thought
            yield {"event": "on_chat_model_start", "data": {}}
            # Simulate final response
            yield {
                "event": "on_chain_end",
                "name": "LangGraph",
                "data": {
                    "output": {"messages": [{"content": "Hello there", "type": "ai"}]}
                },
            }

    monkeypatch.setattr(agent.graph, "agent_app", MockAgentApp())

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
        assert len(lines) >= 1
        # First line may be a thought
        evt0 = json.loads(lines[0])
        assert "type" in evt0


@pytest.mark.asyncio
async def test_process_audio_stream_end_marker_present(monkeypatch, token):
    async def mock_get_transcription(audio_bytes):
        return "Hello world"

    monkeypatch.setattr(
        services.ai_clients, "_get_transcription", mock_get_transcription
    )

    # Mock Agent App
    class MockAgentApp:
        async def astream_events(self, inputs, version):
            yield {"event": "on_chat_model_start", "data": {}}
            yield {
                "event": "on_chain_end",
                "name": "LangGraph",
                "data": {
                    "output": {"messages": [{"content": "Hello there", "type": "ai"}]}
                },
            }

    monkeypatch.setattr(agent.graph, "agent_app", MockAgentApp())

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
