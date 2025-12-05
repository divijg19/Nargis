from __future__ import annotations

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from storage.models import PomodoroSession


def session_to_dict(s: PomodoroSession) -> dict:
    return {
        "id": s.id,
        "userId": s.user_id,
        "taskId": s.task_id,
        "type": s.type,
        "duration_minutes": s.duration_minutes,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "completed": s.completed,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
    }


def create_session_service(payload: Dict[str, Any], user_id: str, db: Session) -> dict:
    session = PomodoroSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        task_id=payload.get("task_id") or payload.get("taskId"),
        type=payload.get("type", "work"),
        duration_minutes=int(payload.get("duration_minutes") or payload.get("durationMinutes") or 25),
        started_at=datetime.now(timezone.utc),
        ended_at=None,
        completed=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_to_dict(session)


def list_sessions_service(
    user_id: str,
    db: Session,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
) -> List[dict]:
    sort_map = {
        "created_at": PomodoroSession.created_at,
        "updated_at": PomodoroSession.updated_at,
        "started_at": PomodoroSession.started_at,
        "ended_at": PomodoroSession.ended_at,
        "duration_minutes": PomodoroSession.duration_minutes,
        "type": PomodoroSession.type,
        "completed": PomodoroSession.completed,
    }
    col = sort_map.get(sort, PomodoroSession.created_at)
    q = db.query(PomodoroSession).filter(PomodoroSession.user_id == user_id)
    q = q.order_by(col.desc() if order.lower() == "desc" else col.asc())
    if offset:
        q = q.offset(int(offset))
    if limit:
        q = q.limit(int(limit))
    items = q.all()
    return [session_to_dict(s) for s in items]


def get_session_service(session_id: str, user_id: str, db: Session) -> Optional[dict]:
    s = db.query(PomodoroSession).filter(PomodoroSession.id == session_id).first()
    if not s:
        return None
    if s.user_id != user_id:
        return None
    return session_to_dict(s)


def update_session_service(session_id: str, patch: Dict[str, Any], user_id: str, db: Session) -> Optional[dict]:
    s = db.query(PomodoroSession).filter(PomodoroSession.id == session_id).first()
    if not s:
        return None
    if s.user_id != user_id:
        return None
    if "type" in patch and patch["type"] is not None:
        s.type = patch["type"]
    if "duration_minutes" in patch and patch["duration_minutes"] is not None:
        s.duration_minutes = int(patch["duration_minutes"])
    if "durationMinutes" in patch and patch["durationMinutes"] is not None:
        s.duration_minutes = int(patch["durationMinutes"])
    if "ended_at" in patch and patch["ended_at"] is not None:
        s.ended_at = patch["ended_at"]
    if "completed" in patch and patch["completed"] is not None:
        s.completed = bool(patch["completed"])
    s.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(s)
    return session_to_dict(s)


def delete_session_service(session_id: str, user_id: str, db: Session) -> bool:
    s = db.query(PomodoroSession).filter(PomodoroSession.id == session_id).first()
    if not s:
        return False
    if s.user_id != user_id:
        return False
    db.delete(s)
    db.commit()
    return True
