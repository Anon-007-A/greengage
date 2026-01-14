"""
Database Connection and Session Management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import os
from typing import Generator

# Database URL - defaults to SQLite for development, PostgreSQL for production
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./lma_platform.db"  # SQLite for quick setup, can switch to PostgreSQL
)

# For SQLite, use StaticPool to allow multiple threads
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL connection
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables
    """
    from app.models import Base
    # Reset the database tables on initialization in development/test runs to
    # ensure a clean state for repeated test invocations.
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        # If drop_all fails (e.g., in production), continue with create_all
        pass
    Base.metadata.create_all(bind=engine)

