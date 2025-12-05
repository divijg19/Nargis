from __future__ import annotations

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from storage.database import get_db
from services.goals import (
    list_goals_service,
    create_goal_service,
    get_goal_service,
    update_goal_service,
    delete_goal_service,
)

router = APIRouter(prefix="/v1/goals", tags=["goals"])


class MilestoneModel(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    dueDate: Optional[str] = None
    order: int = 0


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    category: str = Field(
        ..., pattern="^(personal|career|health|learning|finance|other)$"
    )
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(
        None, pattern="^(personal|career|health|learning|finance|other)$"
    )
    deadline: Optional[str] = None
    status: Optional[str] = Field(
        None, pattern="^(planning|active|paused|completed|archived)$"
    )
    progress: Optional[int] = Field(None, ge=0, le=100)
    milestones: Optional[List[MilestoneModel]] = None
    linkedTaskIds: Optional[List[str]] = None
    linkedHabitIds: Optional[List[str]] = None


@router.get("", response_model=List[dict])
async def list_goals(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Optional[int] = None,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
):
    """List all goals for the current user"""
    return list_goals_service(
        current_user["id"],
        db,
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Create a new goal"""
    goal_dict = payload.model_dump()
    created = create_goal_service(goal_dict, current_user["id"], db)
    return created


@router.get("/{goal_id}")
async def get_goal(goal_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific goal by ID"""
    goal = get_goal_service(goal_id, current_user["id"], db)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.patch("/{goal_id}")
async def update_goal(
    goal_id: str, patch: GoalUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Update a goal"""
    updated = update_goal_service(goal_id, patch.model_dump(exclude_unset=True), current_user["id"], db)
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a goal"""
    ok = delete_goal_service(goal_id, current_user["id"], db)
    if not ok:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None
