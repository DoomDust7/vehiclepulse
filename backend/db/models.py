import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _uuid():
    return str(uuid.uuid4())


class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=_uuid)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    vehicle_vin = Column(String, nullable=True)
    mock_mode = Column(Boolean, default=False)
    total_readings = Column(Integer, default=0)
    total_faults = Column(Integer, default=0)

    readings = relationship("PIDReadingModel", back_populates="session", cascade="all, delete-orphan")
    faults = relationship("FaultEventModel", back_populates="session", cascade="all, delete-orphan")


class PIDReadingModel(Base):
    __tablename__ = "pid_readings"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    ts = Column(Float, nullable=False, index=True)
    pid = Column(String(4), nullable=False)
    name = Column(String, nullable=False)
    value = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    raw_bytes = Column(String, nullable=True)
    valid = Column(Boolean, default=True)

    session = relationship("SessionModel", back_populates="readings")


class FreezeFrameModel(Base):
    __tablename__ = "freeze_frames"

    id = Column(String, primary_key=True, default=_uuid)
    fault_event_id = Column(String, nullable=False)  # logical ref; no FK to avoid circular dep
    ts = Column(Float, nullable=False)
    snapshot = Column(JSON, nullable=False)


class FaultEventModel(Base):
    __tablename__ = "fault_events"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    ts = Column(Float, nullable=False, index=True)
    pid = Column(String(4), nullable=False)
    pid_name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    threshold_op = Column(String, nullable=False)
    threshold_val = Column(Float, nullable=False)
    severity = Column(String, nullable=False)
    freeze_frame_id = Column(String, nullable=True)  # set after freeze frame inserted

    session = relationship("SessionModel", back_populates="faults")
