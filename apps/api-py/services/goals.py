from __future__ import annotations

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from storage.models import Goal


def goal_to_dict(g: Goal) -> dict:
    return {
        "id": g.id,
        "userId": g.user_id,
        "title": g.title,
        "description": g.description,
        "status": g.status,
        "progress": g.progress,
        "milestones": g.milestones or [],
        "linkedTaskIds": g.linked_task_ids or [],
        "linkedHabitIds": g.linked_habit_ids or [],
        "aiSuggestions": g.ai_suggestions or [],
        "createdAt": g.created_at.isoformat() if g.created_at else None,
        "updatedAt": g.updated_at.isoformat() if g.updated_at else None,
    }


def create_goal_service(payload: Dict[str, Any], user_id: str, db: Session) -> dict:
    goal = Goal(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=payload.get("title"),
        description=payload.get("description"),
        status=payload.get("status", "planning"),
        progress=int(payload.get("progress") or 0),
        milestones=payload.get("milestones") or [],
        linked_task_ids=payload.get("linkedTaskIds") or [],
        linked_habit_ids=payload.get("linkedHabitIds") or [],
        ai_suggestions=payload.get("aiSuggestions") or [],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal_to_dict(goal)


def list_goals_service(
    user_id: str,
    db: Session,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
) -> List[dict]:
    sort_map = {
        "created_at": Goal.created_at,
        "updated_at": Goal.updated_at,
        "title": Goal.title,
        "status": Goal.status,
        "progress": Goal.progress,
    }
    col = sort_map.get(sort, Goal.created_at)
    q = db.query(Goal).filter(Goal.user_id == user_id)
    q = q.order_by(col.desc() if order.lower() == "desc" else col.asc())
    if offset:
        q = q.offset(int(offset))
    if limit:
        q = q.limit(int(limit))
    items = q.all()
    return [goal_to_dict(g) for g in items]


def get_goal_service(goal_id: str, user_id: str, db: Session) -> Optional[dict]:
    g = db.query(Goal).filter(Goal.id == goal_id).first()
    if not g:
        return None
    if g.user_id != user_id:
        return None
    return goal_to_dict(g)


def update_goal_service(goal_id: str, patch: Dict[str, Any], user_id: str, db: Session) -> Optional[dict]:
    g = db.query(Goal).filter(Goal.id == goal_id).first()
    if not g:
        return None
    if g.user_id != user_id:
        return None
    for key in ("title", "description", "status"):
        if key in patch and patch[key] is not None:
            setattr(g, key, patch[key])
    if "progress" in patch and patch["progress"] is not None:
        g.progress = int(patch["progress"])
    if "milestones" in patch and patch["milestones"] is not None:
        g.milestones = patch["milestones"]
    if "linkedTaskIds" in patch and patch["linkedTaskIds"] is not None:
        g.linked_task_ids = patch["linkedTaskIds"]
    if "linkedHabitIds" in patch and patch["linkedHabitIds"] is not None:
        g.linked_habit_ids = patch["linkedHabitIds"]
    if "aiSuggestions" in patch and patch["aiSuggestions"] is not None:
        g.ai_suggestions = patch["aiSuggestions"]
    g.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(g)
    return goal_to_dict(g)


def delete_goal_service(goal_id: str, user_id: str, db: Session) -> bool:
    g = db.query(Goal).filter(Goal.id == goal_id).first()
    if not g:
        return False
    if g.user_id != user_id:
        return False
    db.delete(g)
    db.commit()
    return True
