from __future__ import annotations

from typing import Any

from agent.tools import log_habit_tool, log_journal_tool, start_focus_tool
from storage.database import get_session_now


def _runtime_config(user_id: str, db: Any) -> dict[str, Any]:
    return {"configurable": {"user_id": user_id, "db": db}}


def _invoke_tool(tool_obj: Any, payload: dict[str, Any], config: dict[str, Any]) -> Any:
    if hasattr(tool_obj, "func") and callable(tool_obj.func):
        return tool_obj.func(config=config, **payload)
    if hasattr(tool_obj, "invoke") and callable(tool_obj.invoke):
        return tool_obj.invoke(payload, config=config)
    if callable(tool_obj):
        return tool_obj(config=config, **payload)
    raise TypeError("Tool object is not invokable")


def test_log_habit_tool_logs_completed_by_name(monkeypatch):
    expected_user_id = "user-habit-1"

    captured: dict[str, Any] = {}

    def fake_list_habits(user_id: str, db: Any) -> list[dict[str, Any]]:
        captured["list_user_id"] = user_id
        captured["list_db"] = db
        return [{"id": "h1", "name": "Drink Water", "target": 2}]

    def fake_update_habit_count(
        habit_id: str, payload: dict[str, Any], user_id: str, db: Any
    ) -> dict[str, Any]:
        captured["habit_id"] = habit_id
        captured["payload"] = payload
        captured["update_user_id"] = user_id
        captured["update_db"] = db
        return {"id": habit_id, "currentStreak": 3}

    monkeypatch.setattr("agent.tools.list_habits_service", fake_list_habits)
    monkeypatch.setattr(
        "agent.tools.update_habit_count_service", fake_update_habit_count
    )

    with get_session_now() as db:
        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(
            log_habit_tool,
            {"habit_name": "Drink Water", "status": "completed"},
            config,
        )

    assert result == "Habit 'Drink Water' logged for today."
    assert captured["list_user_id"] == expected_user_id
    assert captured["update_user_id"] == expected_user_id
    assert captured["habit_id"] == "h1"
    assert captured["payload"] == {"count": 2}


def test_log_journal_tool_saves_entry_with_tags(monkeypatch):
    expected_user_id = "user-journal-1"

    captured: dict[str, Any] = {}

    def fake_create_entry(
        payload: dict[str, Any], user_id: str, db: Any
    ) -> dict[str, Any]:
        captured["payload"] = payload
        captured["user_id"] = user_id
        captured["db"] = db
        return {"id": "journal-123"}

    monkeypatch.setattr("agent.tools.create_entry_service", fake_create_entry)

    with get_session_now() as db:
        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(
            log_journal_tool,
            {
                "content": "Reflecting on progress today.",
                "tags": ["reflection", "daily"],
            },
            config,
        )

    assert result == "Journal entry saved (journal-123)."
    assert captured["user_id"] == expected_user_id
    assert captured["payload"]["content"] == "Reflecting on progress today."
    assert captured["payload"]["type"] == "text"
    assert captured["payload"]["tags"] == ["reflection", "daily"]


def test_start_focus_tool_uses_runtime_context_and_returns_success(monkeypatch):
    expected_user_id = "user-focus-1"

    captured: dict[str, Any] = {}

    def fake_create_session(
        payload: dict[str, Any], user_id: str, db: Any
    ) -> dict[str, Any]:
        captured["payload"] = payload
        captured["user_id"] = user_id
        captured["db"] = db
        return {"id": "pomodoro-1", "duration_minutes": 25}

    monkeypatch.setattr("agent.tools.create_session_service", fake_create_session)

    with get_session_now() as db:
        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(
            start_focus_tool,
            {"task_id": "task-9", "duration_minutes": 25},
            config,
        )

    assert result == "Started a 25-minute focus session."
    assert captured["user_id"] == expected_user_id
    assert captured["payload"]["task_id"] == "task-9"
    assert captured["payload"]["duration_minutes"] == 25
