import io
import json

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.mark.integration
def test_process_audio_response_is_plain_text(monkeypatch):
    # Arrange: patch transcription and llm to return structured LLM dict
    async def fake_transcription(_audio: bytes) -> str:
        return "Hello"

    async def fake_llm_response(_text: str) -> dict:
        # Return a full LLM-style dict that includes choices
        return {
            "choices": [
                {"message": {"content": "This is a plain English assistant reply."}}
            ]
        }

    monkeypatch.setattr("services.ai_clients._get_transcription", fake_transcription)
    monkeypatch.setattr("services.ai_clients._get_llm_response", fake_llm_response)

    client = TestClient(app)

    # Use a tiny dummy file as the audio upload
    files = {"audio_file": ("a.webm", io.BytesIO(b"dummy"), "audio/webm")}

    # Act: call the endpoint (streaming NDJSON)
    with client.stream(
        "POST", "/api/v1/process-audio", files=files, data={"mode": "chat"}
    ) as resp:
        assert resp.status_code == 200
        saw_response = False
        saw_end = False
        for raw in resp.iter_lines():
            if not raw:
                continue
            try:
                ev = json.loads(raw)
            except Exception:
                continue
            if ev.get("type") == "response":
                saw_response = True
                content = ev.get("content")
                assert isinstance(content, str)
                # No JSON-like characters
                assert "{" not in content
                assert "}" not in content
                assert '"choices"' not in content
            if ev.get("type") == "end":
                saw_end = True
        assert saw_response, "No response event seen in NDJSON"
        assert saw_end, "No end event seen in NDJSON"
