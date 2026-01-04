from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from storage.models import Task


def task_to_dict(t: Task) -> dict:
    return {
        "id": t.id,
        "userId": t.user_id,
        "parentId": t.parent_id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "dueDate": t.due_date,
        "tags": t.tags or [],
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
        "subtasks": [task_to_dict(sub) for sub in t.subtasks] if t.subtasks else [],
    }


def create_task_service(payload: dict[str, Any], user_id: str, db: Session) -> dict:
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
        parent_id=payload.get("parentId") or payload.get("parent_id"),
        title=payload.get("title"),
        description=payload.get("description"),
        status=payload.get("status", "pending"),
        priority=payload.get("priority"),
        due_date=payload.get("due_date") or payload.get("dueDate"),
        tags=payload.get("tags", []),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


def list_tasks_service(
    user_id: str,
    db: Session,
    *,
    limit: int | None = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
) -> list[dict]:
    sort_map = {
        "created_at": Task.created_at,
        "updated_at": Task.updated_at,
        "due_date": Task.due_date,
        "priority": Task.priority,
        "status": Task.status,
        "title": Task.title,
    }
    col = sort_map.get(sort, Task.created_at)
    # Only fetch top-level tasks by default to avoid duplication
    # Subtasks are loaded via relationship in task_to_dict
    q = db.query(Task).filter(Task.user_id == user_id, Task.parent_id.is_(None))
    q = q.order_by(col.desc() if order.lower() == "desc" else col.asc())
    if offset:
        q = q.offset(int(offset))
    if limit:
        q = q.limit(int(limit))
    tasks = q.all()
    return [task_to_dict(t) for t in tasks]


def get_task_service(task_id: str, user_id: str, db: Session) -> dict | None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    if task.user_id != user_id:
        return None
    return task_to_dict(task)


def update_task_service(
    task_id: str, patch: dict[str, Any], user_id: str, db: Session
) -> dict | None:
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
    if "tags" in updates:
        task.tags = updates["tags"]
    if "parentId" in updates or "parent_id" in updates:
        task.parent_id = updates.get("parentId") or updates.get("parent_id")
    task.updated_at = datetime.now(UTC)
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


def toggle_task_service(task_id: str, user_id: str, db: Session) -> dict | None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    if task.user_id != user_id:
        return None
    # Map: pending/in_progress/done
    next_status = "done" if task.status != "done" else "pending"
    task.status = next_status
    task.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)
