from __future__ import annotations

from pydantic import BaseModel, Field


class TaskResponse(BaseModel):
    id: str
    userId: str
    parentId: str | None = None
    title: str
    description: str | None = None
    status: str
    priority: str | None = None
    dueDate: str | None = None
    tags: list[str] = Field(default_factory=list)
    createdAt: str | None = None
    updatedAt: str | None = None
    subtasks: list[TaskResponse] = Field(default_factory=list)


TaskResponse.model_rebuild()


class HabitEntryResponse(BaseModel):
    date: str
    count: int
    completed: bool


class HabitResponse(BaseModel):
    id: str
    userId: str
    name: str
    target: int
    unit: str | None = None
    frequency: str | None = None
    color: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    streak: int = 0
    currentStreak: int = 0
    bestStreak: int = 0
    history: list[HabitEntryResponse] = Field(default_factory=list)


class JournalEntryResponse(BaseModel):
    id: str
    userId: str
    title: str | None = None
    content: str
    type: str
    mood: str | None = None
    tags: list[str] = Field(default_factory=list)
    audioUrl: str | None = None
    aiSummary: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class JournalSummaryResponse(BaseModel):
    summary: str | None = None
    entry: JournalEntryResponse


class PomodoroSessionResponse(BaseModel):
    id: str
    userId: str
    taskId: str | None = None
    type: str
    duration_minutes: int
    started_at: str | None = None
    ended_at: str | None = None
    completed: bool
    createdAt: str | None = None
    updatedAt: str | None = None
