"""SQLAlchemy database wiring: engine, session factory, and the ORM base.

The generated entity models map to tables created by the SQL migrations (see
app/migrate.py). Ordinary SQLAlchemy — nothing here is specific to Thraksha.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yield a session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
