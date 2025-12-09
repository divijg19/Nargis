from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from routers.auth import get_current_user

# Import service functions
from services.tasks import (
    create_task_service,
    delete_task_service,
    get_task_service,
    list_tasks_service,
    toggle_task_service,
    update_task_service,
)
from storage.database import get_db
from storage.models import Task

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    status: str = Field(default="pending")
    priority: str | None = None
    due_date: str | None = None  # ISO date


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=300)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None


@router.get("", response_model=list[dict])
async def list_tasks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int | None = None,
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
    Idempotency_Key: str | None = Header(default=None, convert_underscores=False),
):
    # Idempotency: check for existing response
    from services.idempotency import get_idempotent_response, save_idempotent_response

    if Idempotency_Key:
        saved = get_idempotent_response(
            db, Idempotency_Key, current_user.get("id"), "POST", "/v1/tasks"
        )
        if saved:
            return saved["response"]

    created = create_task_service(payload.model_dump(), current_user["id"], db)

    # Publish event
    try:
        from services.event_bus import get_event_bus

        await get_event_bus().publish(current_user["id"], "task_created", created)
    except Exception as e:
        # Log error but don't fail request
        print(f"Failed to publish event: {e}")

    if Idempotency_Key:
        save_idempotent_response(
            db,
            Idempotency_Key,
            current_user.get("id"),
            "POST",
            "/v1/tasks",
            201,
            created,
        )

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
