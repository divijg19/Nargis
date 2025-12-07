from __future__ import annotations

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from storage.database import get_db
from services.pomodoro import (
    list_sessions_service,
    create_session_service,
    get_session_service,
    update_session_service,
    delete_session_service,
)

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
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
):
    return list_sessions_service(
        current_user["id"],
        db,
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: PomodoroCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    Idempotency_Key: Optional[str] = Header(default=None, convert_underscores=False),
):
    from services.idempotency import get_idempotent_response, save_idempotent_response

    data = payload.model_dump()
    if Idempotency_Key:
        saved = get_idempotent_response(db, Idempotency_Key, current_user.get("id"), "POST", "/v1/pomodoro")
        if saved:
            return saved["response"]

    created = create_session_service(data, current_user["id"], db)

    if Idempotency_Key:
        save_idempotent_response(db, Idempotency_Key, current_user.get("id"), "POST", "/v1/pomodoro", 201, created)

    return created


@router.get("/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = get_session_service(session_id, current_user["id"], db)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "SESSION_NOT_FOUND",
                    "message": f"No session with id: {session_id}",
                }
            },
        )
    return session


@router.patch("/{session_id}")
async def update_session(
    session_id: str,
    patch: PomodoroUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = update_session_service(session_id, patch.model_dump(exclude_unset=True), current_user["id"], db)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "SESSION_NOT_FOUND",
                    "message": f"No session with id: {session_id}",
                }
            },
        )
    return updated


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)
):
    ok = delete_session_service(session_id, current_user["id"], db)
    if not ok:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "SESSION_NOT_FOUND",
                    "message": f"No session with id: {session_id}",
                }
            },
        )
    return None
