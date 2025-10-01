from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from storage.memory import pomodoro_repo

router = APIRouter(prefix="/v1/pomodoro", tags=["pomodoro"])


class PomodoroCreate(BaseModel):
    task_id: Optional[str] = None
    type: str = Field(default="work")  # work | short_break | long_break
    duration_minutes: int = Field(default=25, ge=1, le=180)


class PomodoroUpdate(BaseModel):
    ended_at: Optional[datetime] = None
    completed: Optional[bool] = None
    type: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=180)


@router.get("", response_model=List[dict])
async def list_sessions():
    return await pomodoro_repo.list()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(payload: PomodoroCreate):
    data = payload.model_dump()
    data["started_at"] = datetime.utcnow().isoformat()
    data["completed"] = False
    return await pomodoro_repo.create(data)


@router.get("/{session_id}")
async def get_session(session_id: str):
    session = await pomodoro_repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail={"error": {"code": "SESSION_NOT_FOUND", "message": f"No session with id: {session_id}"}})
    return session


@router.patch("/{session_id}")
async def update_session(session_id: str, patch: PomodoroUpdate):
    updated = await pomodoro_repo.update(session_id, patch.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail={"error": {"code": "SESSION_NOT_FOUND", "message": f"No session with id: {session_id}"}})
    return updated


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    deleted = await pomodoro_repo.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": {"code": "SESSION_NOT_FOUND", "message": f"No session with id: {session_id}"}})
    return None
