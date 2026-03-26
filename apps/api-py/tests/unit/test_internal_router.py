from __future__ import annotations

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_cron_tick_blocks_when_secret_missing(monkeypatch):
    monkeypatch.setenv("INTERNAL_CRON_SECRET", "test-secret")

    response = client.post("/api/v1/internal/cron/tick")

    assert response.status_code == 403


def test_cron_tick_blocks_when_secret_invalid(monkeypatch):
    monkeypatch.setenv("INTERNAL_CRON_SECRET", "test-secret")

    response = client.post(
        "/api/v1/internal/cron/tick",
        headers={"X-Internal-Secret": "wrong-secret"},
    )

    assert response.status_code == 403
