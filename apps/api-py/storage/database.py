"""
Database configuration for PostgreSQL with SQLAlchemy
"""

import os
from contextlib import contextmanager

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

# Load .env so local DATABASE_URL is available when this module is imported.
load_dotenv(override=True)

# Get database URL from environment, default to SQLite for development
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./nargis.db",  # Fallback to SQLite for easy development
)

# Use SQLite automatically when running pytest unless explicitly allowed
if ("PYTEST_CURRENT_TEST" in os.environ) and os.getenv(
    "ALLOW_POSTGRES_IN_TESTS"
) != "1":
    DATABASE_URL = "sqlite:///./nargis.db"

# For SQLite in-memory/file databases, use specific connection args
connect_args = {}
poolclass = None

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    poolclass = StaticPool
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        poolclass=poolclass,
        echo=True,  # Log SQL queries in development
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        echo=True,  # Log SQL queries in development
    )
    # If Postgres is configured but unavailable (e.g., local tests), fall back to SQLite
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
    except Exception:
        fallback_url = "sqlite:///./nargis.db"
        engine = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=True,
        )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class for all models
class Base(DeclarativeBase):
    pass


# Eagerly create tables in most environments to simplify dev/tests
if os.getenv("AUTO_CREATE_DB", "1") == "1":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass


def get_db():
    """
    Dependency function to get database session
    Usage in FastAPI:
        from storage.database import get_db

        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_session_now():
    """
    Context manager to create and yield a SQLAlchemy Session for use
    outside of the FastAPI dependency injection system (e.g., in agent tools).

    Usage:
        with get_session_now() as db:
            # use db
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


def drop_db():
    """Drop all tables - use with caution!"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️  Database tables dropped")
