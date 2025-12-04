from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from storage.models import Base
from services.journal import (
    create_entry_service,
    list_entries_service,
    get_entry_service,
    update_entry_service,
    delete_entry_service,
    generate_summary_service,
)


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_journal_crud_and_summary():
    db = make_session()
    user_id = "user-j"

    # create (aiSummary should be generated if missing)
    payload = {"title": "Test", "content": "Today I wrote code. It was fun."}
    created = create_entry_service(payload, user_id, db)
    assert created["title"] == "Test"
    eid = created["id"]

    # list
    listed = list_entries_service(user_id, db)
    assert any(e["id"] == eid for e in listed)

    # get
    got = get_entry_service(eid, user_id, db)
    assert got is not None and got["id"] == eid

    # generate summary
    summary = generate_summary_service(eid, user_id, db)
    assert summary is not None and "aiSummary" in summary

    # update
    updated = update_entry_service(eid, {"title": "Updated"}, user_id, db)
    assert updated is not None and updated["title"] == "Updated"

    # delete
    ok = delete_entry_service(eid, user_id, db)
    assert ok
    assert get_entry_service(eid, user_id, db) is None
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from storage.database import Base
from storage.models import User
from services.journal import (
    create_entry_service,
    list_entries_service,
    get_entry_service,
    update_entry_service,
    delete_entry_service,
    generate_summary_service,
)


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
