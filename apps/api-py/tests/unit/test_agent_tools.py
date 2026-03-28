from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from agent.tools import (
    analyze_productivity_tool,
    log_habit_tool,
    log_journal_tool,
    start_focus_tool,
)
from storage.models import (
    Base,
    Habit,
    HabitEntry,
    JournalEntry,
    PomodoroSession,
    Task,
    User,
)


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


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


def test_log_habit_tool_logs_completed_by_name():
    SessionLocal = setup_inmemory_db()
    expected_user_id = "user-habit-1"

    with SessionLocal() as db:
        db.add(User(id=expected_user_id, email="habit@test.dev", password_hash="x"))
        db.add(
            Habit(
                id="h1",
                user_id=expected_user_id,
                name="Drink Water",
                target=2,
                unit="cups",
                frequency="daily",
            )
        )
        db.commit()

        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(
            log_habit_tool,
            {"habit_name": "Drink Water", "status": "completed"},
            config,
        )

    assert result == "Habit 'Drink Water' logged for today."
    with SessionLocal() as db:
        entry = db.query(HabitEntry).filter(HabitEntry.habit_id == "h1").first()
        assert entry is not None
        assert int(entry.count) == 2
        assert bool(entry.completed) is True


def test_log_journal_tool_saves_entry_with_tags():
    SessionLocal = setup_inmemory_db()
    expected_user_id = "user-journal-1"

    with SessionLocal() as db:
        db.add(User(id=expected_user_id, email="journal@test.dev", password_hash="x"))
        db.commit()

        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(
            log_journal_tool,
            {
                "content": "Reflecting on progress today.",
                "tags": ["reflection", "daily"],
            },
            config,
        )

    assert result.startswith("Journal entry saved (")
    with SessionLocal() as db:
        entry = (
            db.query(JournalEntry)
            .filter(JournalEntry.user_id == expected_user_id)
            .first()
        )
        assert entry is not None
        assert entry.content == "Reflecting on progress today."
        assert entry.type == "text"
        assert entry.tags == ["reflection", "daily"]


def test_start_focus_tool_uses_runtime_context_and_returns_success():
    SessionLocal = setup_inmemory_db()
    expected_user_id = "user-focus-1"

    with SessionLocal() as db:
        db.add(User(id=expected_user_id, email="focus@test.dev", password_hash="x"))
        db.commit()

        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(
            start_focus_tool,
            {"task_id": "task-9", "duration_minutes": 25},
            config,
        )

    assert result == "Started a 25-minute focus session."
    with SessionLocal() as db:
        session = (
            db.query(PomodoroSession)
            .filter(PomodoroSession.user_id == expected_user_id)
            .first()
        )
        assert session is not None
        assert session.task_id == "task-9"
        assert int(session.duration_minutes) == 25


def test_analyze_productivity_tool_returns_condensed_weekly_summary():
    SessionLocal = setup_inmemory_db()
    expected_user_id = "user-analytics-1"
    now = datetime.now(UTC)

    with SessionLocal() as db:
        db.add(User(id=expected_user_id, email="analytics@test.dev", password_hash="x"))

        db.add_all(
            [
                Task(
                    id="t-done",
                    user_id=expected_user_id,
                    title="Done task",
                    description=None,
                    status="done",
                    priority="medium",
                    due_date=None,
                    tags=[],
                    created_at=now - timedelta(days=1),
                    updated_at=now - timedelta(days=1),
                ),
                Task(
                    id="t-pending",
                    user_id=expected_user_id,
                    title="Pending task",
                    description=None,
                    status="pending",
                    priority="low",
                    due_date=None,
                    tags=[],
                    created_at=now - timedelta(days=2),
                    updated_at=now - timedelta(days=2),
                ),
            ]
        )

        db.add_all(
            [
                PomodoroSession(
                    id="p-1",
                    user_id=expected_user_id,
                    task_id="t-done",
                    type="work",
                    duration_minutes=25,
                    started_at=now - timedelta(days=1),
                    ended_at=now - timedelta(days=1, minutes=-25),
                    completed=True,
                    created_at=now - timedelta(days=1),
                    updated_at=now - timedelta(days=1),
                ),
                PomodoroSession(
                    id="p-2",
                    user_id=expected_user_id,
                    task_id="t-done",
                    type="work",
                    duration_minutes=15,
                    started_at=now - timedelta(days=1),
                    ended_at=now - timedelta(days=1, minutes=-15),
                    completed=True,
                    created_at=now - timedelta(days=1),
                    updated_at=now - timedelta(days=1),
                ),
            ]
        )

        db.add(
            Habit(
                id="h-analytics",
                user_id=expected_user_id,
                name="Read",
                target=1,
                unit="pages",
                frequency="daily",
                color="blue",
                created_at=now - timedelta(days=3),
                updated_at=now - timedelta(days=1),
            )
        )
        db.add_all(
            [
                HabitEntry(
                    habit_id="h-analytics",
                    date=(now - timedelta(days=1)).date().isoformat(),
                    count=1,
                    completed=True,
                ),
                HabitEntry(
                    habit_id="h-analytics",
                    date=(now - timedelta(days=2)).date().isoformat(),
                    count=1,
                    completed=True,
                ),
            ]
        )
        db.commit()

        config = _runtime_config(expected_user_id, db)
        result = _invoke_tool(analyze_productivity_tool, {}, config)

    assert "tasks_completed=1" in result
    assert "tasks_pending=1" in result
    assert "focus_minutes=40" in result
    assert "habits_hit=2" in result
