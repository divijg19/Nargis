from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.tasks import (
    create_task_service,
    delete_task_service,
    get_task_service,
    list_tasks_service,
    toggle_task_service,
    update_task_service,
)
from storage.models import Base, User


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def test_task_crud_toggle_and_nested_listing_flow():
    SessionLocal = setup_inmemory_db()
    db = SessionLocal()

    user = User(id="user-task-1", email="task@test", password_hash="x")
    db.add(user)
    db.commit()

    parent = create_task_service(
        {
            "title": "Parent Task",
            "description": "top level",
            "status": "pending",
            "priority": "medium",
            "dueDate": "2026-03-06",
            "tags": ["work", "focus"],
        },
        "user-task-1",
        db,
    )
    assert parent["title"] == "Parent Task"
    assert parent["status"] == "pending"
    assert parent["tags"] == ["work", "focus"]

    child = create_task_service(
        {
            "title": "Child Task",
            "parentId": parent["id"],
            "status": "in_progress",
        },
        "user-task-1",
        db,
    )
    assert child["parentId"] == parent["id"]

    top_level = list_tasks_service("user-task-1", db)
    assert len(top_level) == 1
    assert top_level[0]["id"] == parent["id"]
    assert len(top_level[0]["subtasks"]) == 1
    assert top_level[0]["subtasks"][0]["id"] == child["id"]

    toggled = toggle_task_service(parent["id"], "user-task-1", db)
    assert toggled is not None
    assert toggled["status"] == "done"

    untoggled = toggle_task_service(parent["id"], "user-task-1", db)
    assert untoggled is not None
    assert untoggled["status"] == "pending"

    updated = update_task_service(
        parent["id"],
        {
            "title": "Parent Task Updated",
            "due_date": "2026-03-08",
            "tags": ["deep-work"],
        },
        "user-task-1",
        db,
    )
    assert updated is not None
    assert updated["title"] == "Parent Task Updated"
    assert updated["dueDate"] == "2026-03-08"
    assert updated["tags"] == ["deep-work"]

    fetched = get_task_service(parent["id"], "user-task-1", db)
    assert fetched is not None
    assert fetched["id"] == parent["id"]

    assert get_task_service(parent["id"], "other-user", db) is None

    ordered = list_tasks_service(
        "user-task-1",
        db,
        sort="title",
        order="asc",
        limit=10,
        offset=0,
    )
    assert len(ordered) == 1
    assert ordered[0]["id"] == parent["id"]

    assert delete_task_service(parent["id"], "other-user", db) is False
    assert delete_task_service(parent["id"], "user-task-1", db) is True
    assert get_task_service(parent["id"], "user-task-1", db) is None
