from __future__ import annotations

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from storage.models import Task


def task_to_dict(t: Task) -> dict:
    return {
        "id": t.id,
        "userId": t.user_id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "dueDate": t.due_date,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
    }


def create_task_service(payload: Dict[str, Any], user_id: str, db: Session) -> dict:
    """
    Create a Task record from a plain dict or Pydantic model.dict().

    Args:
        payload: dict with keys like title, description, status, priority, due_date
        user_id: owner id for the task
        db: SQLAlchemy Session

    Returns:
        dict representation of the created task
    """
    task = Task(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=payload.get("title"),
        description=payload.get("description"),
        status=payload.get("status", "pending"),
        priority=payload.get("priority"),
        due_date=payload.get("due_date") or payload.get("dueDate"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


def list_tasks_service(user_id: str, db: Session) -> List[dict]:
    tasks = db.query(Task).filter(Task.user_id == user_id).all()
    return [task_to_dict(t) for t in tasks]


def get_task_service(task_id: str, user_id: str, db: Session) -> Optional[dict]:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    if task.user_id != user_id:
        return None
    return task_to_dict(task)


def update_task_service(
    task_id: str, patch: Dict[str, Any], user_id: str, db: Session
) -> Optional[dict]:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    if task.user_id != user_id:
        return None
    updates = patch
    if "title" in updates:
        task.title = updates["title"]
    if "description" in updates:
        task.description = updates["description"]
    if "status" in updates:
        task.status = updates["status"]
    if "priority" in updates:
        task.priority = updates["priority"]
    if "due_date" in updates or "dueDate" in updates:
        task.due_date = updates.get("due_date") or updates.get("dueDate")
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


def delete_task_service(task_id: str, user_id: str, db: Session) -> bool:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    if task.user_id != user_id:
        return False
    db.delete(task)
    db.commit()
    return True
