from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from ..db.database import open_session
from ..db.crud import get_faults_for_session, get_freeze_frame, get_session_by_id

router = APIRouter(tags=["faults"])


def get_db():
    db = open_session()
    try:
        yield db
    finally:
        db.close()


@router.get("/sessions/{session_id}/faults")
def list_faults(session_id: str, db: DBSession = Depends(get_db)):
    s = get_session_by_id(db, session_id)
    if not s:
        raise HTTPException(404, detail="Session not found")
    return [_serialize_fault(f) for f in get_faults_for_session(db, session_id)]


@router.get("/faults/{fault_id}/freeze-frame")
def get_fault_freeze_frame(fault_id: str, db: DBSession = Depends(get_db)):
    ff = get_freeze_frame(db, fault_id)
    if not ff:
        raise HTTPException(404, detail="Freeze frame not found")
    return {"id": ff.id, "fault_event_id": ff.fault_event_id, "ts": ff.ts, "snapshot": ff.snapshot}


def _serialize_fault(f) -> dict:
    return {
        "id": f.id,
        "session_id": f.session_id,
        "ts": f.ts,
        "pid": f.pid,
        "pid_name": f.pid_name,
        "value": f.value,
        "threshold_op": f.threshold_op,
        "threshold_val": f.threshold_val,
        "severity": f.severity,
        "freeze_frame_id": f.freeze_frame_id,
    }
