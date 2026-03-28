from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from storage.models import Habit, HabitEntry, PomodoroSession, Task


def analyze_weekly_productivity_service(db: Session, user_id: str) -> dict[str, int]:
    cutoff_dt = datetime.now(UTC) - timedelta(days=7)
    cutoff_day = cutoff_dt.date().isoformat()

    tasks_completed = (
        db.query(func.count(Task.id))
        .filter(
            and_(
                Task.user_id == user_id,
                Task.updated_at >= cutoff_dt,
                Task.status == "done",
            )
        )
        .scalar()
        or 0
    )

    tasks_pending = (
        db.query(func.count(Task.id))
        .filter(
            and_(
                Task.user_id == user_id,
                Task.updated_at >= cutoff_dt,
                Task.status != "done",
            )
        )
        .scalar()
        or 0
    )

    focus_minutes = (
        db.query(func.coalesce(func.sum(PomodoroSession.duration_minutes), 0))
        .filter(
            and_(
                PomodoroSession.user_id == user_id,
                PomodoroSession.completed.is_(True),
                PomodoroSession.started_at >= cutoff_dt,
            )
        )
        .scalar()
        or 0
    )

    habits_hit = (
        db.query(func.count(HabitEntry.id))
        .join(Habit, Habit.id == HabitEntry.habit_id)
        .filter(
            and_(
                Habit.user_id == user_id,
                HabitEntry.completed.is_(True),
                HabitEntry.date >= cutoff_day,
            )
        )
        .scalar()
        or 0
    )

    return {
        "tasks_completed": int(tasks_completed),
        "tasks_pending": int(tasks_pending),
        "focus_minutes": int(focus_minutes),
        "habits_hit": int(habits_hit),
    }
