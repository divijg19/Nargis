from datetime import UTC, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from storage.models import Habit, HabitEntry, Task, User


def get_user_daily_context(db: Session, user_id: str) -> str:
    """Build a compact daily state summary for system-prompt injection."""
    now_iso = datetime.now(UTC).isoformat()
    today = datetime.now(UTC).date().isoformat()

    user_name = db.scalar(select(User.name).where(User.id == user_id))

    task_filters = (
        Task.user_id == user_id,
        Task.status != "done",
        Task.due_date.is_not(None),
        Task.due_date <= now_iso,
    )
    pending_task_count = (
        db.scalar(select(func.count(Task.id)).where(*task_filters)) or 0
    )
    pending_task_titles = db.scalars(
        select(Task.title)
        .where(
            *task_filters,
        )
        .order_by(Task.due_date.asc(), Task.id.asc())
        .limit(3)
    ).all()

    pending_habit_query = (
        select(Habit.name)
        .outerjoin(
            HabitEntry,
            and_(
                HabitEntry.habit_id == Habit.id,
                HabitEntry.date == today,
                HabitEntry.completed.is_(True),
            ),
        )
        .where(Habit.user_id == user_id, HabitEntry.id.is_(None))
        .order_by(Habit.name.asc())
    )
    pending_habit_names = db.scalars(pending_habit_query.limit(5)).all()
    pending_habit_count = (
        db.scalar(
            select(func.count())
            .select_from(Habit)
            .outerjoin(
                HabitEntry,
                and_(
                    HabitEntry.habit_id == Habit.id,
                    HabitEntry.date == today,
                    HabitEntry.completed.is_(True),
                ),
            )
            .where(Habit.user_id == user_id, HabitEntry.id.is_(None))
        )
        or 0
    )

    if pending_task_count == 0 and pending_habit_count == 0:
        return "[TODAY'S STATE] Clear schedule."

    parts: list[str] = []
    if user_name:
        parts.append(f"User:{user_name}.")
    if pending_task_count > 0:
        task_titles = ";".join(t for t in pending_task_titles if t)
        if task_titles:
            parts.append(f"Pending Tasks:{pending_task_count} ({task_titles}).")
        else:
            parts.append(f"Pending Tasks:{pending_task_count}.")
    if pending_habit_count > 0:
        names = ",".join(pending_habit_names)
        if names:
            parts.append(f"Unlogged Habits:{names}.")
        else:
            parts.append(f"Unlogged Habits:{pending_habit_count}.")

    return "[TODAY'S STATE] " + " ".join(parts)


def get_system_context(user_id: str, db: Session) -> str:
    """Compatibility wrapper for older call sites."""
    return get_user_daily_context(db, user_id)
