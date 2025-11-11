from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from storage.memory import tasks_repo, idempotent_post
from routers.auth import get_current_user

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
async def list_tasks(current_user: dict = Depends(get_current_user)):
    all_tasks = await tasks_repo.list()
    return [t for t in all_tasks if t.get("userId") == current_user["id"]]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: dict = Depends(get_current_user),
    Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False)
):
    # Basic idempotency support
    key = Idempotency_Key or None
    task_data = payload.model_dump()
    task_data["userId"] = current_user["id"]
    
    if key:
        record, replay = await idempotent_post(key, tasks_repo.create(task_data))
        if replay:
            # Return existing representation (201 kept for simplicity; could be 200)
            return record
        return record
    return await tasks_repo.create(task_data)


@router.get("/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await tasks_repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    if task.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    return task


@router.patch("/{task_id}")
async def update_task(task_id: str, patch: TaskUpdate, current_user: dict = Depends(get_current_user)):
    task = await tasks_repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    if task.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    
    updated = await tasks_repo.update(task_id, patch.model_dump(exclude_unset=True))
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await tasks_repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "TASK_NOT_FOUND", "message": f"No task with id: {task_id}"}})
    if task.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    
    await tasks_repo.delete(task_id)
    return None
