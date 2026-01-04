from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from storage.models import Habit, HabitEntry, PomodoroSession, Task


def get_system_context(user_id: str, db: Session) -> str:
    """
    Aggregates system state into a natural language string for the AI agent.
    """
    context_parts = []

    # 1. Overdue Tasks
    now_iso = datetime.now(UTC).isoformat()
    overdue_tasks = db.scalars(
        select(Task).where(
            Task.user_id == user_id, Task.status != "done", Task.due_date < now_iso
        )
    ).all()

    if overdue_tasks:
        titles = ", ".join([f"'{t.title}'" for t in overdue_tasks[:3]])
        count = len(overdue_tasks)
        context_parts.append(f"User has {count} overdue tasks (e.g., {titles}).")

    # 2. Habits for Today
    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
    habits = db.scalars(select(Habit).where(Habit.user_id == user_id)).all()
    pending_habits = []
    for h in habits:
        # Check if entry exists for today
        entry = db.scalar(
            select(HabitEntry).where(
                HabitEntry.habit_id == h.id, HabitEntry.date == today_str
            )
        )
        if not entry or not entry.completed:
            pending_habits.append(h.name)

    if pending_habits:
        habits_str = ", ".join(pending_habits[:5])
        context_parts.append(f"Pending habits for today: {habits_str}.")

    # 3. Current Focus (Pomodoro)
    active_session = db.scalar(
        select(PomodoroSession).where(
            PomodoroSession.user_id == user_id,
            PomodoroSession.completed.is_(False),
            PomodoroSession.ended_at.is_(None),
        )
    )

    if active_session:
        start_time = active_session.started_at
        context_parts.append(
            f"User is currently in a '{active_session.type}' focus session "
            f"started at {start_time}."
        )

    return " ".join(context_parts)
