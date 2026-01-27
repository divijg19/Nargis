import json

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_process_audio_response_normalized(monkeypatch):
    """Ensure the NDJSON 'response' event contains only assistant text."""

    async def fake_transcription(_audio_bytes: bytes) -> str:
        return "Hello transcription"

    async def fake_llm_response(_text: str) -> dict:
        # Return a typical LLM dict (OpenAI/Groq-like) to ensure server
        # normalization prefers choices[0].message.content
        return {"choices": [{"message": {"content": "This is a friendly reply."}}]}

    # Patch STT and LLM helpers used by the endpoint
    import services.ai_clients as ai_clients

    monkeypatch.setattr(ai_clients, "_get_transcription", fake_transcription)
    monkeypatch.setattr(ai_clients, "_get_llm_response", fake_llm_response)

    files = {"audio_file": ("a.webm", b"dummy-audio-bytes", "audio/webm")}

    resp = client.post("/api/v1/process-audio?mode=chat", files=files)
    assert resp.status_code == 200

    # Streamed NDJSON: iterate over non-empty lines
    found_response = False
    for line in resp.iter_lines():
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if obj.get("type") == "response":
            found_response = True
            content = obj.get("content")
            assert isinstance(content, str)
            # Must not be a JSON blob or include the 'choices' key text
            assert "{" not in content
            assert '"choices"' not in content
            assert "[" not in content
    assert found_response, "No response event was emitted"
