"""
Database configuration for PostgreSQL with SQLAlchemy
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool

# Get database URL from environment, default to SQLite for development
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./nargis.db"  # Fallback to SQLite for easy development
)

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
        echo=True  # Log SQL queries in development
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        echo=True  # Log SQL queries in development
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class for all models
class Base(DeclarativeBase):
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


def init_db():
    """Initialize database - create all tables"""
    from storage.models import User, Task, Habit, Goal, JournalEntry, PomodoroSession
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


def drop_db():
    """Drop all tables - use with caution!"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️  Database tables dropped")
