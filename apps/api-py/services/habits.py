from __future__ import annotations

import uuid
from datetime import UTC, datetime
from datetime import date as date_cls
from typing import Any

from sqlalchemy.orm import Session

from storage.models import Habit, HabitEntry


def _compute_streaks(entries: list[HabitEntry]) -> dict[str, int]:
    if not entries:
        return {"currentStreak": 0, "bestStreak": 0}

    # Convert entries to a set of date objects for easier lookup
    # entries have .date as "YYYY-MM-DD" string
    completed_dates = set()
    for e in entries:
        if e.completed:
            try:
                d = datetime.strptime(e.date, "%Y-%m-%d").date()
                completed_dates.add(d)
            except ValueError:
                continue  # Skip invalid dates

    if not completed_dates:
        return {"currentStreak": 0, "bestStreak": 0}

    # Use UTC date to avoid server local time issues,
    # though ideally this should be user-local
    today = datetime.now(UTC).date()

    # Current Streak
    current_streak = 0
    check_date = today

    # If today is not completed, check if yesterday was completed (forgiving streak)
    if check_date not in completed_dates:
        check_date = check_date.fromordinal(check_date.toordinal() - 1)
        if check_date not in completed_dates:
            # Neither today nor yesterday completed -> streak broken
            current_streak = 0
        else:
            # Yesterday completed, so streak is alive
            pass

    # Count backwards from the valid check_date
    if check_date in completed_dates:
        while check_date in completed_dates:
            current_streak += 1
            check_date = check_date.fromordinal(check_date.toordinal() - 1)

    # Best Streak
    best_streak = 0
    running_streak = 0
    sorted_dates = sorted(list(completed_dates))

    if sorted_dates:
        running_streak = 1
        best_streak = 1
        for i in range(1, len(sorted_dates)):
            prev = sorted_dates[i - 1]
            curr = sorted_dates[i]
            if curr.toordinal() == prev.toordinal() + 1:
                running_streak += 1
            else:
                running_streak = 1
            best_streak = max(best_streak, running_streak)

    return {"currentStreak": current_streak, "bestStreak": best_streak}


def habit_to_dict(h: Habit) -> dict:
    # Build history from related entries if loaded/available
    try:
        entries: list[HabitEntry] = list(getattr(h, "entries", []) or [])
    except Exception:
        entries = []
    history = [
        {"date": e.date, "count": int(e.count or 0), "completed": bool(e.completed)}
        for e in sorted(entries, key=lambda x: x.date, reverse=False)
    ]
    streaks = _compute_streaks(entries)
    return {
        "id": h.id,
        "userId": h.user_id,
        "name": h.name,
        "target": h.target,
        "unit": h.unit,
        "frequency": h.frequency,
        "color": h.color,
        "createdAt": h.created_at.isoformat() if h.created_at else None,
        "updatedAt": h.updated_at.isoformat() if h.updated_at else None,
        "streak": streaks.get("currentStreak", 0),
        "currentStreak": streaks.get("currentStreak", 0),
        "bestStreak": streaks.get("bestStreak", 0),
        "history": history,
    }


def create_habit_service(payload: dict[str, Any], user_id: str, db: Session) -> dict:
    habit = Habit(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.get("name"),
        target=payload.get("target", 1),
        unit=payload.get("unit"),
        frequency=payload.get("frequency"),
        color=payload.get("color"),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit_to_dict(habit)


def list_habits_service(
    user_id: str,
    db: Session,
    *,
    limit: int | None = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
) -> list[dict]:
    sort_map = {
        "created_at": Habit.created_at,
        "updated_at": Habit.updated_at,
        "name": Habit.name,
        "target": Habit.target,
    }
    col = sort_map.get(sort, Habit.created_at)
    q = db.query(Habit).filter(Habit.user_id == user_id)
    q = q.order_by(col.desc() if order.lower() == "desc" else col.asc())
    if offset:
        q = q.offset(int(offset))
    if limit:
        q = q.limit(int(limit))
    results = q.all()
    return [habit_to_dict(h) for h in results]


def get_habit_service(habit_id: str, user_id: str, db: Session) -> dict | None:
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        return None
    if h.user_id != user_id:
        return None
    return habit_to_dict(h)


def update_habit_service(
    habit_id: str, patch: dict[str, Any], user_id: str, db: Session
) -> dict | None:
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        return None
    if h.user_id != user_id:
        return None
    if "name" in patch:
        h.name = patch["name"]
    if "target" in patch:
        h.target = patch["target"]
    if "unit" in patch:
        h.unit = patch["unit"]
    if "frequency" in patch:
        h.frequency = patch["frequency"]
    if "color" in patch:
        h.color = patch["color"]
    h.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(h)
    return habit_to_dict(h)


def delete_habit_service(habit_id: str, user_id: str, db: Session) -> bool:
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        return False
    if h.user_id != user_id:
        return False
    db.delete(h)
    db.commit()
    return True


def update_habit_count_service(
    habit_id: str, payload: dict[str, Any], user_id: str, db: Session
) -> dict | None:
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        return None
    if h.user_id != user_id:
        return None
    today = date_cls.today().isoformat()
    # Upsert today's entry
    entry = (
        db.query(HabitEntry)
        .filter(HabitEntry.habit_id == habit_id, HabitEntry.date == today)
        .first()
    )
    if not entry:
        entry = HabitEntry(habit_id=habit_id, date=today, count=0, completed=False)
        db.add(entry)
    if "count" in payload and payload["count"] is not None:
        entry.count = int(payload["count"])
    elif "delta" in payload and payload["delta"] is not None:
        entry.count = int(entry.count or 0) + int(payload["delta"])
        if entry.count < 0:
            entry.count = 0
    # mark completion if met/exceeded target
    try:
        entry.completed = bool((entry.count or 0) >= int(h.target or 1))
    except Exception:
        entry.completed = bool((entry.count or 0) > 0)
    entry.updated_at = datetime.now(UTC)
    h.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(h)
    return habit_to_dict(h)
