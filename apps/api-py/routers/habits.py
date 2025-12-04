from __future__ import annotations

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from storage.database import get_db
from storage.models import Habit
from routers.auth import get_current_user

from services.habits import (
    create_habit_service,
    list_habits_service,
    get_habit_service,
    update_habit_service,
    delete_habit_service,
)

router = APIRouter(prefix="/v1/habits", tags=["habits"])


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=140)
    target: int = Field(default=1, ge=1)
    unit: Optional[str] = None
    frequency: Optional[str] = None
    color: Optional[str] = None


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=140)
    target: Optional[int] = Field(None, ge=1)
    unit: Optional[str] = None
    frequency: Optional[str] = None
    color: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
async def list_habits(
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)
):
    return list_habits_service(current_user["id"], db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_habit(
    payload: HabitCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    return create_habit_service(data, current_user["id"], db)


@router.get("/{habit_id}")
async def get_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = get_habit_service(habit_id, current_user["id"], db)
    if not habit:
        # Decide between 404 and 403 by checking existence
        h = db.query(Habit).filter(Habit.id == habit_id).first()
        if not h:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "HABIT_NOT_FOUND",
                        "message": f"No habit with id: {habit_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return habit


@router.patch("/{habit_id}")
async def update_habit(
    habit_id: str,
    patch: HabitUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = update_habit_service(
        habit_id, patch.model_dump(exclude_unset=True), current_user["id"], db
    )
    if not updated:
        h = db.query(Habit).filter(Habit.id == habit_id).first()
        if not h:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "HABIT_NOT_FOUND",
                        "message": f"No habit with id: {habit_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return updated


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = delete_habit_service(habit_id, current_user["id"], db)
    if not ok:
        h = db.query(Habit).filter(Habit.id == habit_id).first()
        if not h:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "HABIT_NOT_FOUND",
                        "message": f"No habit with id: {habit_id}",
                    }
                },
            )
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    return None
