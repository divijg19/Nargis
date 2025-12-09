from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.journal import (
    create_entry_service,
    delete_entry_service,
    generate_summary_service,
    get_entry_service,
    list_entries_service,
    update_entry_service,
)
from storage.models import Base, User


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def test_journal_crud_and_summary():
    SessionLocal = setup_inmemory_db()
    db = SessionLocal()

    user = User(id="user-j-1", email="j@test", password_hash="x")
    db.add(user)
    db.commit()

    payload = {"title": "My Day", "content": "Today I went running. It was nice."}
    created = create_entry_service(payload, "user-j-1", db)
    assert created["title"] == "My Day"

    all_entries = list_entries_service("user-j-1", db)
    assert len(all_entries) == 1

    eid = created["id"]
    got = get_entry_service(eid, "user-j-1", db)
    assert got is not None and got["id"] == eid

    upd = update_entry_service(eid, {"content": "Updated content."}, "user-j-1", db)
    assert upd["content"] == "Updated content."

    summary = generate_summary_service(eid, "user-j-1", db)
    assert "aiSummary" in summary and isinstance(summary["aiSummary"], str)

    ok = delete_entry_service(eid, "user-j-1", db)
    assert ok is True

    assert get_entry_service(eid, "user-j-1", db) is None
