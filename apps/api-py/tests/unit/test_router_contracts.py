from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from routers.resource_access import raise_owned_resource_error
from routers.response_models import JournalSummaryResponse, TaskResponse
from storage.models import Base, Task, User


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def test_raise_owned_resource_error_distinguishes_404_and_403():
    SessionLocal = setup_inmemory_db()
    db = SessionLocal()

    user = User(id="user-1", email="owner@test", password_hash="x")
    other = User(id="user-2", email="other@test", password_hash="x")
    task = Task(id="task-1", user_id="user-1", title="Example task")
    db.add_all([user, other, task])
    db.commit()

    try:
        raise_owned_resource_error(
            db,
            Task,
            "missing-task",
            "user-1",
            code="TASK_NOT_FOUND",
            noun="task",
        )
    except HTTPException as exc:
        assert exc.status_code == 404
        assert exc.detail["error"]["code"] == "TASK_NOT_FOUND"

    try:
        raise_owned_resource_error(
            db,
            Task,
            "task-1",
            "user-2",
            code="TASK_NOT_FOUND",
            noun="task",
        )
    except HTTPException as exc:
        assert exc.status_code == 403
        assert exc.detail["error"]["code"] == "FORBIDDEN"


def test_response_models_accept_current_service_shapes():
    task_payload = {
        "id": "task-1",
        "userId": "user-1",
        "parentId": None,
        "title": "Parent",
        "description": None,
        "status": "pending",
        "priority": "medium",
        "dueDate": "2026-03-30",
        "tags": ["focus"],
        "createdAt": "2026-03-30T00:00:00Z",
        "updatedAt": "2026-03-30T00:00:00Z",
        "subtasks": [
            {
                "id": "task-2",
                "userId": "user-1",
                "parentId": "task-1",
                "title": "Child",
                "description": None,
                "status": "pending",
                "priority": None,
                "dueDate": None,
                "tags": [],
                "createdAt": None,
                "updatedAt": None,
                "subtasks": [],
            }
        ],
    }

    summary_payload = {
        "summary": "Done.",
        "entry": {
            "id": "entry-1",
            "userId": "user-1",
            "title": "Morning briefing",
            "content": "All set",
            "type": "text",
            "mood": "good",
            "tags": ["system_briefing"],
            "audioUrl": None,
            "aiSummary": "Done.",
            "createdAt": "2026-03-30T00:00:00Z",
            "updatedAt": "2026-03-30T00:00:00Z",
        },
    }

    task = TaskResponse.model_validate(task_payload)
    summary = JournalSummaryResponse.model_validate(summary_payload)

    assert task.subtasks[0].parentId == "task-1"
    assert summary.entry.aiSummary == "Done."
