"""Database configuration for PostgreSQL/SQLite with SQLAlchemy.

This module is imported at startup. It must be resilient across environments:
- Local development
- Pytest
- Hugging Face Spaces (filesystem restrictions; /tmp is writable)
"""

import logging
import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

load_dotenv(override=True)


def _is_running_on_huggingface() -> bool:
    return bool(
        os.getenv("SPACE_ID")
        or os.getenv("HF_SPACE_ID")
        or os.getenv("SYSTEM") == "spaces"
    )


def _default_sqlite_url() -> str:
    # HF Spaces filesystem is often restrictive; /tmp is reliably writable.
    if _is_running_on_huggingface():
        return "sqlite:////tmp/nargis.db"
    return "sqlite:///./nargis.db"


def _ensure_sqlite_parent_dir(database_url: str) -> None:
    if not database_url.startswith("sqlite"):
        return
    if ":memory:" in database_url:
        return

    # SQLAlchemy sqlite URLs:
    # - sqlite:///relative/path.db
    # - sqlite:////absolute/path.db
    if database_url.startswith("sqlite:////"):
        path_str = "/" + database_url.removeprefix("sqlite:////")
    elif database_url.startswith("sqlite:///"):
        path_str = database_url.removeprefix("sqlite:///")
    else:
        return

    Path(path_str).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)


DATABASE_URL = os.getenv("DATABASE_URL") or _default_sqlite_url()

# Use SQLite automatically when running pytest unless explicitly allowed.
if ("PYTEST_CURRENT_TEST" in os.environ) and os.getenv(
    "ALLOW_POSTGRES_IN_TESTS"
) != "1":
    DATABASE_URL = "sqlite:///./nargis.db"

SQL_ECHO = os.getenv("SQL_ECHO", "false").lower() == "true"


def _make_engine(database_url: str):
    if database_url.startswith("sqlite"):
        _ensure_sqlite_parent_dir(database_url)
        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=SQL_ECHO,
        )

    return create_engine(
        database_url,
        pool_pre_ping=True,
        echo=SQL_ECHO,
    )


engine = _make_engine(DATABASE_URL)

# If Postgres is configured but unavailable (or preflight fails), fall back to SQLite.
if not DATABASE_URL.startswith("sqlite"):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        logging.exception(
            "Postgres preflight failed; falling back to SQLite (DATABASE_URL=%s)",
            DATABASE_URL,
        )
        DATABASE_URL = _default_sqlite_url()
        engine = _make_engine(DATABASE_URL)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


if os.getenv("AUTO_CREATE_DB", "1") == "1":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logging.exception("AUTO_CREATE_DB failed (DATABASE_URL=%s)", DATABASE_URL)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass


@contextmanager
def get_session_now():
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass


def init_db():
    Base.metadata.create_all(bind=engine)
    logging.info("Database tables ensured")


def drop_db():
    Base.metadata.drop_all(bind=engine)
    logging.warning("Database tables dropped")
