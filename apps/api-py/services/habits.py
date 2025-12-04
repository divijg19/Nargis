from __future__ import annotations

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from storage.models import Habit


def habit_to_dict(h: Habit) -> dict:
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


def list_habits_service(user_id: str, db: Session) -> List[dict]:
    results = db.query(Habit).filter(Habit.user_id == user_id).all()
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
