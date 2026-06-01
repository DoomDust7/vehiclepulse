import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from ..db.database import open_session
from ..db.crud import get_session_by_id, get_readings_page, get_faults_for_session

router = APIRouter(prefix="/sessions", tags=["export"])


def get_db():
    db = open_session()
    try:
        yield db
    finally:
        db.close()


@router.get("/{session_id}/export/csv")
def export_csv(session_id: str, db: DBSession = Depends(get_db)):
    s = get_session_by_id(db, session_id)
    if not s:
        raise HTTPException(404, detail="Session not found")

    fault_ts = {f.ts for f in get_faults_for_session(db, session_id)}

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["timestamp", "pid_hex", "pid_name", "value", "unit", "valid", "is_fault_flagged"])
        yield buf.getvalue()

        cursor = 0.0
        while True:
            rows = get_readings_page(db, session_id, cursor, 1000)
            if not rows:
                break
            for row in rows:
                buf = io.StringIO()
                writer = csv.writer(buf)
                writer.writerow([
                    row.ts, row.pid, row.name,
                    row.value, row.unit, row.valid,
                    row.ts in fault_ts,
                ])
                yield buf.getvalue()
            cursor = rows[-1].ts

    filename = f"vehiclepulse_{session_id[:8]}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{session_id}/export/faults-csv")
def export_faults_csv(session_id: str, db: DBSession = Depends(get_db)):
    s = get_session_by_id(db, session_id)
    if not s:
        raise HTTPException(404, detail="Session not found")

    faults = get_faults_for_session(db, session_id)

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "timestamp", "pid_hex", "pid_name", "value", "threshold_op",
            "threshold_val", "severity", "freeze_frame_id",
        ])
        yield buf.getvalue()

        for f in faults:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                f.ts, f.pid, f.pid_name, f.value,
                f.threshold_op, f.threshold_val, f.severity, f.freeze_frame_id,
            ])
            yield buf.getvalue()

    filename = f"vehiclepulse_faults_{session_id[:8]}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
