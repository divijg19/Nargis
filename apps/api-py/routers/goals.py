from __future__ import annotations

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from storage.memory import goals_repo
from routers.auth import get_current_user

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
    category: str = Field(..., pattern="^(personal|career|health|learning|finance|other)$")
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, pattern="^(personal|career|health|learning|finance|other)$")
    deadline: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(planning|active|paused|completed|archived)$")
    progress: Optional[int] = Field(None, ge=0, le=100)
    milestones: Optional[List[MilestoneModel]] = None
    linkedTaskIds: Optional[List[str]] = None
    linkedHabitIds: Optional[List[str]] = None


@router.get("", response_model=List[dict])
async def list_goals(current_user: dict = Depends(get_current_user)):
    """List all goals for the current user"""
    all_goals = await goals_repo.list()
    return [g for g in all_goals if g.get("userId") == current_user["id"]]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalCreate, current_user: dict = Depends(get_current_user)):
    """Create a new goal"""
    goal_dict = payload.model_dump()
    goal_dict["userId"] = current_user["id"]
    goal_dict["status"] = "planning"
    goal_dict["progress"] = 0
    goal_dict["milestones"] = []
    goal_dict["linkedTaskIds"] = []
    goal_dict["linkedHabitIds"] = []
    goal_dict["aiSuggestions"] = []
    goal_dict["createdAt"] = datetime.utcnow().isoformat()
    goal_dict["updatedAt"] = datetime.utcnow().isoformat()
    
    created = await goals_repo.create(goal_dict)
    return created


@router.get("/{goal_id}")
async def get_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific goal by ID"""
    goal = await goals_repo.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return goal


@router.patch("/{goal_id}")
async def update_goal(goal_id: str, patch: GoalUpdate, current_user: dict = Depends(get_current_user)):
    """Update a goal"""
    goal = await goals_repo.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        updates["updatedAt"] = datetime.utcnow().isoformat()
        await goals_repo.update(goal_id, updates)
    
    return await goals_repo.get(goal_id)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a goal"""
    goal = await goals_repo.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    await goals_repo.delete(goal_id)
    return None
