from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.idempotency import (
    get_idempotent_response,
    prune_old_keys,
    save_idempotent_response,
)
from storage.models import Base, IdempotencyKey, User


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def test_idempotency_save_and_get():
    SessionLocal = setup_inmemory_db()
    db = SessionLocal()

    # create user for FK
    user = User(id="user-1", email="u@test", password_hash="x")
    db.add(user)
    db.commit()

    key = "idem-123"
    user_id = "user-1"
    method = "POST"
    path = "/v1/tasks"
    payload = {"id": "t1", "title": "Test"}

    # initially absent
    assert get_idempotent_response(db, key, user_id, method, path) is None

    save_idempotent_response(db, key, user_id, method, path, 201, payload)

    saved = get_idempotent_response(db, key, user_id, method, path)
    assert saved is not None
    assert saved["status_code"] == 201
    assert saved["response"] == payload


def test_prune_old_keys():
    SessionLocal = setup_inmemory_db()
    db = SessionLocal()

    # Create an old key manually to bypass auto-timestamp
    old_key = IdempotencyKey(
        id=str(uuid.uuid4()),
        key="old-key",
        method="POST",
        path="/test",
        status_code=200,
        created_at=datetime.now(UTC) - timedelta(hours=25),
    )
    db.add(old_key)

    # Create a new key
    new_key = IdempotencyKey(
        id=str(uuid.uuid4()),
        key="new-key",
        method="POST",
        path="/test",
        status_code=200,
        created_at=datetime.now(UTC),
    )
    db.add(new_key)
    db.commit()

    # Prune
    deleted = prune_old_keys(db, max_age_hours=24)
    assert deleted == 1

    # Verify
    assert db.query(IdempotencyKey).filter_by(key="old-key").first() is None
    assert db.query(IdempotencyKey).filter_by(key="new-key").first() is not None
