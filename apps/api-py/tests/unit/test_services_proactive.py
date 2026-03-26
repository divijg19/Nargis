from __future__ import annotations

from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.proactive import run_proactive_checks_service
from storage.models import Base, Habit, JournalEntry, User


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def test_run_proactive_checks_exits_early_without_users(monkeypatch):
    session_factory = setup_inmemory_db()
    db = session_factory()

    llm_called = {"value": False}

    async def fake_get_llm_response(text: str) -> dict[str, Any]:
        llm_called["value"] = True
        return {"reply": text}

    monkeypatch.setattr("services.proactive._get_llm_response", fake_get_llm_response)

    run_proactive_checks_service(db)

    assert llm_called["value"] is False
    assert db.query(JournalEntry).count() == 0


def test_run_proactive_checks_handles_empty_tasks_and_saves_briefing(monkeypatch):
    session_factory = setup_inmemory_db()
    db = session_factory()

    user = User(
        id="user-proactive-1",
        email="proactive@test.dev",
        password_hash="x",
    )
    habit = Habit(
        id="habit-1",
        user_id=user.id,
        name="Hydration",
        target=8,
        unit="cups",
    )
    db.add(user)
    db.add(habit)
    db.commit()

    captured: dict[str, Any] = {}

    def fake_list_tasks(user_id: str, db_session: Any) -> list[dict[str, Any]]:
        assert user_id == user.id
        return []

    def fake_list_habits(user_id: str, db_session: Any) -> list[dict[str, Any]]:
        assert user_id == user.id
        return [
            {
                "id": "habit-1",
                "name": "Hydration",
                "target": 8,
                "unit": "cups",
                "currentStreak": 3,
            }
        ]

    async def fake_get_llm_response(text: str) -> dict[str, Any]:
        captured["prompt"] = text
        return {
            "choices": [
                {
                    "message": {
                        "content": (
                            "Prioritize consistency in your routines today. "
                            "Reinforce hydration early to create momentum. "
                            "Use habit completion to set up tomorrow's execution."
                        )
                    }
                }
            ]
        }

    monkeypatch.setattr("services.proactive.list_tasks_service", fake_list_tasks)
    monkeypatch.setattr("services.proactive.list_habits_service", fake_list_habits)
    monkeypatch.setattr("services.proactive._get_llm_response", fake_get_llm_response)

    run_proactive_checks_service(db)

    assert (
        "You have no pending tasks today! Focus on your habits." in captured["prompt"]
    )
    assert "Hydration" in captured["prompt"]

    saved = db.query(JournalEntry).all()
    assert len(saved) == 1
    assert saved[0].user_id == user.id
    assert saved[0].title == "Morning Briefing"
    assert saved[0].tags == ["system_briefing", "auto"]
    assert "Prioritize consistency" in saved[0].content


def test_run_proactive_checks_uses_only_pending_tasks_in_prompt(monkeypatch):
    session_factory = setup_inmemory_db()
    db = session_factory()

    user = User(id="user-proactive-2", email="proactive2@test.dev", password_hash="x")
    db.add(user)
    db.commit()

    captured: dict[str, Any] = {}

    def fake_list_tasks(user_id: str, db_session: Any) -> list[dict[str, Any]]:
        return [
            {
                "id": "task-1",
                "title": "Prepare sprint plan",
                "status": "pending",
                "priority": "high",
                "dueDate": "2026-03-27",
            },
            {
                "id": "task-2",
                "title": "Completed item",
                "status": "done",
                "priority": "low",
                "dueDate": None,
            },
        ]

    def fake_list_habits(user_id: str, db_session: Any) -> list[dict[str, Any]]:
        return []

    async def fake_get_llm_response(text: str) -> dict[str, Any]:
        captured["prompt"] = text
        return {
            "reply": (
                "Focus on the sprint plan, execute deeply, and close with review."
            )
        }

    monkeypatch.setattr("services.proactive.list_tasks_service", fake_list_tasks)
    monkeypatch.setattr("services.proactive.list_habits_service", fake_list_habits)
    monkeypatch.setattr("services.proactive._get_llm_response", fake_get_llm_response)

    run_proactive_checks_service(db)

    assert "Prepare sprint plan" in captured["prompt"]
    assert "Completed item" not in captured["prompt"]

    saved = db.query(JournalEntry).all()
    assert len(saved) == 1
    assert saved[0].title == "Morning Briefing"
    assert "Focus on the sprint plan" in saved[0].content
