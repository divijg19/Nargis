from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from storage.memory import habits_repo

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
async def list_habits():
    return await habits_repo.list()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate):
    return await habits_repo.create(payload.model_dump())


@router.get("/{habit_id}")
async def get_habit(habit_id: str):
    habit = await habits_repo.get(habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail={"error": {"code": "HABIT_NOT_FOUND", "message": f"No habit with id: {habit_id}"}})
    return habit


@router.patch("/{habit_id}")
async def update_habit(habit_id: str, patch: HabitUpdate):
    updated = await habits_repo.update(habit_id, patch.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail={"error": {"code": "HABIT_NOT_FOUND", "message": f"No habit with id: {habit_id}"}})
    return updated


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(habit_id: str):
    deleted = await habits_repo.delete(habit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": {"code": "HABIT_NOT_FOUND", "message": f"No habit with id: {habit_id}"}})
    return None
