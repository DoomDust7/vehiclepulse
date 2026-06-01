from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from ..db.database import open_session
from ..db.crud import list_sessions, get_session_by_id

router = APIRouter(prefix="/sessions", tags=["sessions"])


def get_db():
    db = open_session()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def list_all_sessions(db: DBSession = Depends(get_db)):
    sessions = list_sessions(db)
    return [_serialize(s) for s in sessions]


@router.get("/{session_id}")
def get_session_detail(session_id: str, db: DBSession = Depends(get_db)):
    s = get_session_by_id(db, session_id)
    if not s:
        raise HTTPException(404, detail="Session not found")
    return _serialize(s)


def _serialize(s) -> dict:
    return {
        "id": s.id,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "vehicle_vin": s.vehicle_vin,
        "mock_mode": s.mock_mode,
        "total_readings": s.total_readings,
        "total_faults": s.total_faults,
    }
