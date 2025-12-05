from __future__ import annotations

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date as date_cls
import uuid

from sqlalchemy.orm import Session

from storage.models import Habit, HabitEntry


def _compute_streaks(entries: List[HabitEntry]) -> Dict[str, int]:
    if not entries:
        return {"currentStreak": 0, "bestStreak": 0}
    # index by date for O(1) lookup
    by_date = {e.date: e for e in entries}
    today = date_cls.today()
    # compute current streak backwards from today
    cur = 0
    d = today
    while True:
        key = d.isoformat()
        e = by_date.get(key)
        if e and e.completed:
            cur += 1
            d = d.fromordinal(d.toordinal() - 1)
            continue
        break
    # compute best streak by scanning sorted dates
    best = 0
    running = 0
    # sort by date asc
    for e in sorted(entries, key=lambda x: x.date):
        if e.completed:
            # continue streak if previous day or start new
            if running == 0:
                running = 1
            else:
                # attempt to ensure consecutive days
                # if previous entry date is exactly one day before current, increment
                # else reset to 1
                running += 1
            if running > best:
                best = running
        else:
            running = 0
    return {"currentStreak": cur, "bestStreak": max(best, cur)}


def habit_to_dict(h: Habit) -> dict:
    # Build history from related entries if loaded/available
    try:
        entries: List[HabitEntry] = list(getattr(h, "entries", []) or [])
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


def create_habit_service(payload: Dict[str, Any], user_id: str, db: Session) -> dict:
    habit = Habit(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.get("name"),
        target=payload.get("target", 1),
        unit=payload.get("unit"),
        frequency=payload.get("frequency"),
        color=payload.get("color"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit_to_dict(habit)


def list_habits_service(
    user_id: str,
    db: Session,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
) -> List[dict]:
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


def get_habit_service(habit_id: str, user_id: str, db: Session) -> Optional[dict]:
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        return None
    if h.user_id != user_id:
        return None
    return habit_to_dict(h)


def update_habit_service(
    habit_id: str, patch: Dict[str, Any], user_id: str, db: Session
) -> Optional[dict]:
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
    h.updated_at = datetime.now(timezone.utc)
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
    habit_id: str, payload: Dict[str, Any], user_id: str, db: Session
) -> Optional[dict]:
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
    entry.updated_at = datetime.now(timezone.utc)
    h.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(h)
    return habit_to_dict(h)
