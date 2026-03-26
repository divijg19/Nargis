from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _register_user_and_get_token() -> str:
    email = f"briefing-{uuid4().hex[:8]}@nargis.ai"
    payload = {
        "email": email,
        "password": "SecurePass123!",
        "name": "Briefing User",
    }
    response = client.post("/v1/auth/register", json=payload)
    assert response.status_code == 201
    token = response.json().get("access_token")
    assert isinstance(token, str) and token
    return token


def test_get_latest_briefing_returns_404_when_absent():
    token = _register_user_and_get_token()
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/v1/journal/briefing", headers=headers)

    assert response.status_code == 404


def test_get_latest_briefing_returns_most_recent_system_entry():
    token = _register_user_and_get_token()
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post(
        "/v1/journal",
        headers=headers,
        json={
            "title": "Morning Briefing",
            "content": "Start with your hardest task first.",
            "type": "text",
            "tags": ["system_briefing", "auto"],
        },
    )
    assert first.status_code == 201

    second = client.post(
        "/v1/journal",
        headers=headers,
        json={
            "title": "Morning Briefing",
            "content": "Prioritize deep work before meetings today.",
            "type": "text",
            "tags": ["system_briefing", "auto"],
        },
    )
    assert second.status_code == 201

    response = client.get("/v1/journal/briefing", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload.get("title") == "Morning Briefing"
    assert payload.get("content") == "Prioritize deep work before meetings today."
    assert "system_briefing" in (payload.get("tags") or [])
