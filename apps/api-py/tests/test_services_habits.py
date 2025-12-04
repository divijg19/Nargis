from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from storage.models import Base
from services.habits import (
    create_habit_service,
    list_habits_service,
    get_habit_service,
    update_habit_service,
    delete_habit_service,
)


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_habit_crud_flow():
    db = make_session()
    user_id = "user-test"

    # create
    payload = {"name": "Exercise", "target": 1}
    created = create_habit_service(payload, user_id, db)
    assert created["name"] == "Exercise"
    hid = created["id"]

    # list
    listed = list_habits_service(user_id, db)
    assert any(h["id"] == hid for h in listed)

    # get
    got = get_habit_service(hid, user_id, db)
    assert got is not None and got["id"] == hid

    # update
    updated = update_habit_service(hid, {"name": "Run"}, user_id, db)
    assert updated is not None and updated["name"] == "Run"

    # delete
    ok = delete_habit_service(hid, user_id, db)
    assert ok
    assert get_habit_service(hid, user_id, db) is None
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from storage.database import Base
from storage.models import User
from services.habits import (
    create_habit_service,
    list_habits_service,
    get_habit_service,
    update_habit_service,
    delete_habit_service,
)


def setup_inmemory_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def test_habit_crud_flow():
    SessionLocal = setup_inmemory_db()
    db = SessionLocal()

    # create a user required by foreign key
    user = User(id="user-test-1", email="u@test", password_hash="x")
    db.add(user)
    db.commit()

    payload = {"name": "Drink Water", "target": 2, "unit": "cups"}
    created = create_habit_service(payload, "user-test-1", db)
    assert created["name"] == "Drink Water"

    all_habits = list_habits_service("user-test-1", db)
    assert len(all_habits) == 1

    hid = created["id"]
    got = get_habit_service(hid, "user-test-1", db)
    assert got is not None and got["id"] == hid

    upd = update_habit_service(
        hid, {"target": 3, "name": "Drink More"}, "user-test-1", db
    )
    assert upd["target"] == 3 and upd["name"] == "Drink More"

    ok = delete_habit_service(hid, "user-test-1", db)
    assert ok is True

    assert get_habit_service(hid, "user-test-1", db) is None
