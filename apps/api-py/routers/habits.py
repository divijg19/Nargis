from __future__ import annotations

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from storage.memory import habits_repo
from routers.auth import get_current_user

router = APIRouter(prefix="/v1/habits", tags=["habits"])


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=140)
    target: int = Field(default=1, ge=1)
    unit: Optional[str] = None
    frequency: Optional[str] = None  # e.g., daily, weekly
    color: Optional[str] = None


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=140)
    target: Optional[int] = Field(None, ge=1)
    unit: Optional[str] = None
    frequency: Optional[str] = None
    color: Optional[str] = None


@router.get("", response_model=List[dict])
async def list_habits(current_user: dict = Depends(get_current_user)):
    all_habits = await habits_repo.list()
    return [h for h in all_habits if h.get("userId") == current_user["id"]]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate, current_user: dict = Depends(get_current_user)):
    habit_data = payload.model_dump()
    habit_data["userId"] = current_user["id"]
    return await habits_repo.create(habit_data)


@router.get("/{habit_id}")
async def get_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    habit = await habits_repo.get(habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail={"error": {"code": "HABIT_NOT_FOUND", "message": f"No habit with id: {habit_id}"}})
    if habit.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    return habit


@router.patch("/{habit_id}")
async def update_habit(habit_id: str, patch: HabitUpdate, current_user: dict = Depends(get_current_user)):
    habit = await habits_repo.get(habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail={"error": {"code": "HABIT_NOT_FOUND", "message": f"No habit with id: {habit_id}"}})
    if habit.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    
    updated = await habits_repo.update(habit_id, patch.model_dump(exclude_unset=True))
    return updated


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    habit = await habits_repo.get(habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail={"error": {"code": "HABIT_NOT_FOUND", "message": f"No habit with id: {habit_id}"}})
    if habit.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})
    
    await habits_repo.delete(habit_id)
    return None
