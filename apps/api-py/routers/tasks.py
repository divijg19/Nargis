from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from storage.database import get_db
from storage.models import Task
from routers.auth import get_current_user
import uuid

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    status: str = Field(default="pending")
    priority: Optional[str] = None
    due_date: Optional[str] = None  # ISO date


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


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


@router.get("", response_model=List[dict])
async def list_tasks(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.user_id == current_user["id"]).all()
    return [task_to_dict(t) for t in tasks]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False),
):
    # NOTE: Idempotency header accepted but DB-backed idempotency store not implemented yet.
    task = Task(
        id=str(uuid.uuid4()),
        user_id=current_user["id"],
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@router.get("/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    if task.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    return task_to_dict(task)


@router.patch("/{task_id}")
async def update_task(task_id: str, patch: TaskUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    if task.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})

    updates = patch.model_dump(exclude_unset=True)
    if "title" in updates:
        task.title = updates["title"]
    if "description" in updates:
        task.description = updates["description"]
    if "status" in updates:
        task.status = updates["status"]
    if "priority" in updates:
        task.priority = updates["priority"]
    if "due_date" in updates:
        task.due_date = updates["due_date"]

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    if task.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})

    db.delete(task)
    db.commit()
    return None
