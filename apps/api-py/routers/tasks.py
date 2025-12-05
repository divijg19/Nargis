from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from storage.database import get_db
from storage.models import Task
from routers.auth import get_current_user

# Import service functions
from services.tasks import (
    create_task_service,
    list_tasks_service,
    get_task_service,
    update_task_service,
    delete_task_service,
    toggle_task_service,
)

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


@router.get("", response_model=List[dict])
async def list_tasks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
):
    return list_tasks_service(
        current_user["id"],
        db,
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False),
):
    # Delegate to service layer
    created = create_task_service(payload.model_dump(), current_user["id"], db)
    return created


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = get_task_service(task_id, current_user["id"], db)
    if not result:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "TASK_NOT_FOUND",
                        "message": f"No task with id: {task_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return result


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    patch: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = update_task_service(
        task_id, patch.model_dump(exclude_unset=True), current_user["id"], db
    )
    if not updated:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "TASK_NOT_FOUND",
                        "message": f"No task with id: {task_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = delete_task_service(task_id, current_user["id"], db)
    if not ok:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "TASK_NOT_FOUND",
                        "message": f"No task with id: {task_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return None


@router.post("/{task_id}/toggle")
async def toggle_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = toggle_task_service(task_id, current_user["id"], db)
    if not updated:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "TASK_NOT_FOUND",
                        "message": f"No task with id: {task_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return updated
