from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from storage.memory import tasks_repo, idempotent_post

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
async def list_tasks():
    return await tasks_repo.list()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False)):
    # Basic idempotency support
    key = Idempotency_Key or None
    if key:
        record, replay = await idempotent_post(key, tasks_repo.create(payload.model_dump()))
        if replay:
            # Return existing representation (201 kept for simplicity; could be 200)
            return record
        return record
    return await tasks_repo.create(payload.model_dump())


@router.get("/{task_id}")
async def get_task(task_id: str):
    task = await tasks_repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    return task


@router.patch("/{task_id}")
async def update_task(task_id: str, patch: TaskUpdate):
    updated = await tasks_repo.update(task_id, patch.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str):
    deleted = await tasks_repo.delete(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    return None
