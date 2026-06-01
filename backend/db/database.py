from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from .models import Base


_engine = None
_SessionLocal = None


def init_db(db_path: str) -> None:
    global _engine, _SessionLocal

    _engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )

    # Enable WAL mode for concurrent reads during writes
    @event.listens_for(_engine, "connect")
    def set_wal(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA journal_mode=WAL")
        dbapi_conn.execute("PRAGMA synchronous=NORMAL")

    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


def open_session() -> Session:
    """Returns a plain SQLAlchemy session. Caller is responsible for commit/close."""
    return _SessionLocal()


def get_engine():
    return _engine
