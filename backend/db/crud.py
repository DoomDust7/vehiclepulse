import uuid
import asyncio
import time
from typing import Optional
from sqlalchemy.orm import Session
from .models import SessionModel, PIDReadingModel, FaultEventModel, FreezeFrameModel
from .database import open_session


# ── Session ──────────────────────────────────────────────────────────────────

def create_session(mock_mode: bool, vehicle_vin: Optional[str] = None) -> SessionModel:
    db = open_session()
    try:
        s = SessionModel(id=str(uuid.uuid4()), mock_mode=mock_mode, vehicle_vin=vehicle_vin)
        db.add(s)
        db.commit()
        db.refresh(s)
        return s
    finally:
        db.close()


def close_session(session_id: str, total_readings: int, total_faults: int) -> None:
    from datetime import datetime
    db = open_session()
    try:
        s = db.query(SessionModel).filter_by(id=session_id).first()
        if s:
            s.ended_at = datetime.utcnow()
            s.total_readings = total_readings
            s.total_faults = total_faults
            db.commit()
    finally:
        db.close()


def list_sessions(db: Session):
    return db.query(SessionModel).order_by(SessionModel.started_at.desc()).all()


def get_session_by_id(db: Session, session_id: str) -> Optional[SessionModel]:
    return db.query(SessionModel).filter_by(id=session_id).first()


# ── PIDReadings (batched) ─────────────────────────────────────────────────────

class ReadingBuffer:
    """Collects PIDReadings in memory and flushes to SQLite every flush_interval_s seconds."""

    def __init__(self, flush_interval_s: float = 1.0):
        self._buf: list[dict] = []
        self._flush_interval = flush_interval_s
        self._last_flush = time.monotonic()
        self._lock = asyncio.Lock()

    async def add(self, reading_dict: dict) -> None:
        async with self._lock:
            self._buf.append(reading_dict)
            if time.monotonic() - self._last_flush >= self._flush_interval:
                await self._flush()

    async def flush_now(self) -> None:
        async with self._lock:
            await self._flush()

    async def _flush(self) -> None:
        if not self._buf:
            return
        batch = self._buf[:]
        self._buf.clear()
        self._last_flush = time.monotonic()
        await asyncio.get_event_loop().run_in_executor(None, self._write_batch, batch)

    @staticmethod
    def _write_batch(batch: list[dict]) -> None:
        db = open_session()
        try:
            db.bulk_insert_mappings(PIDReadingModel, batch)
            db.commit()
        finally:
            db.close()


# ── Faults & FreezeFrames ─────────────────────────────────────────────────────

def save_fault_with_freeze_frame(fault_dict: dict, freeze_snapshot: dict) -> tuple[FaultEventModel, FreezeFrameModel]:
    db = open_session()
    try:
        ff_id = str(uuid.uuid4())
        fe_id = fault_dict["id"]
        ff = FreezeFrameModel(id=ff_id, fault_event_id=fe_id, ts=fault_dict["ts"], snapshot=freeze_snapshot)
        db.add(ff)
        db.flush()
        fe_data = {**fault_dict, "freeze_frame_id": ff_id}
        fe = FaultEventModel(**fe_data)
        db.add(fe)
        db.commit()
        return fe, ff
    finally:
        db.close()


def get_faults_for_session(db: Session, session_id: str):
    return (db.query(FaultEventModel)
            .filter_by(session_id=session_id)
            .order_by(FaultEventModel.ts)
            .all())


def get_freeze_frame(db: Session, fault_id: str) -> Optional[FreezeFrameModel]:
    fe = db.query(FaultEventModel).filter_by(id=fault_id).first()
    if not fe or not fe.freeze_frame_id:
        return None
    return db.query(FreezeFrameModel).filter_by(id=fe.freeze_frame_id).first()


def get_readings_page(db: Session, session_id: str, cursor: float, limit: int):
    return (db.query(PIDReadingModel)
            .filter(PIDReadingModel.session_id == session_id,
                    PIDReadingModel.ts > cursor)
            .order_by(PIDReadingModel.ts)
            .limit(limit)
            .all())
