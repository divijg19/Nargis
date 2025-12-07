"""
SQLAlchemy ORM models for Nargis database
"""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from storage.database import Base

# Safe import of pgvector's Vector type. If it's not installed yet, we
# fall back to storing embeddings as JSON to keep the app usable.
try:
    from pgvector.sqlalchemy import Vector
    _PGVECTOR_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    Vector = None
    _PGVECTOR_AVAILABLE = False


class User(Base):
    """User account model"""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="user", cascade="all, delete-orphan"
    )
    habits: Mapped[List["Habit"]] = relationship(
        "Habit", back_populates="user", cascade="all, delete-orphan"
    )
    goals: Mapped[List["Goal"]] = relationship(
        "Goal", back_populates="user", cascade="all, delete-orphan"
    )
    journal_entries: Mapped[List["JournalEntry"]] = relationship(
        "JournalEntry", back_populates="user", cascade="all, delete-orphan"
    )
    pomodoro_sessions: Mapped[List["PomodoroSession"]] = relationship(
        "PomodoroSession", back_populates="user", cascade="all, delete-orphan"
    )


class Task(Base):
    """Task model"""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # ISO date string
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="tasks")


class Habit(Base):
    """Habit tracking model"""

    __tablename__ = "habits"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    target: Mapped[int] = mapped_column(Integer, default=1)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="habits")
    entries: Mapped[List["HabitEntry"]] = relationship(
        "HabitEntry", back_populates="habit", cascade="all, delete-orphan"
    )


class Goal(Base):
    """Goal planning model"""

    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="planning")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    milestones: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Array of milestone objects
    linked_task_ids: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Array of task IDs
    linked_habit_ids: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Array of habit IDs
    ai_suggestions: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Array of AI suggestions
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="goals")


class JournalEntry(Base):
    """Journal entry model"""

    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="text")  # text | voice
    mood: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # great | good | neutral | bad | terrible
    tags: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Array of tag strings
    audio_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="journal_entries")


class HabitEntry(Base):
    """Per-day habit tracking entries"""

    __tablename__ = "habit_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    habit_id: Mapped[str] = mapped_column(
        String, ForeignKey("habits.id"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    count: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    habit: Mapped["Habit"] = relationship("Habit", back_populates="entries")


class PomodoroSession(Base):
    """Pomodoro focus session model"""

    __tablename__ = "pomodoro_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    task_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(
        String(20), default="work"
    )  # work | short_break | long_break
    duration_minutes: Mapped[int] = mapped_column(Integer, default=25)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="pomodoro_sessions")


class Memory(Base):
    """Long-term semantic memory stored as a vector for RAG retrieval."""

    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # embedding: use pgvector.Vector when available, otherwise JSON fallback
    if _PGVECTOR_AVAILABLE:
        embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(1536), nullable=False)
    else:
        embedding: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class IdempotencyKey(Base):
    """Store responses for Idempotency-Key to make POST idempotent."""

    __tablename__ = "idempotency_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    key: Mapped[str] = mapped_column(String, index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"), nullable=True, index=True)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(300), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

