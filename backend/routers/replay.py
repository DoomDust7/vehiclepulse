import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from ..db.database import open_session
from ..db.crud import get_session_by_id, get_readings_page

router = APIRouter(prefix="/sessions", tags=["replay"])


def get_db():
    db = open_session()
    try:
        yield db
    finally:
        db.close()


@router.get("/{session_id}/replay")
def replay_paginated(
    session_id: str,
    cursor: float = Query(0.0, description="Timestamp cursor — returns readings with ts > cursor"),
    limit: int = Query(500, le=2000),
    db: DBSession = Depends(get_db),
):
    s = get_session_by_id(db, session_id)
    if not s:
        raise HTTPException(404, detail="Session not found")

    rows = get_readings_page(db, session_id, cursor, limit)
    result = [_serialize_reading(r) for r in rows]
    next_cursor = rows[-1].ts if rows else cursor

    return {"items": result, "next_cursor": next_cursor, "has_more": len(rows) == limit}


@router.get("/{session_id}/replay/stream")
async def replay_stream(
    session_id: str,
    speed: float = Query(1.0, description="Playback speed multiplier"),
    db: DBSession = Depends(get_db),
):
    s = get_session_by_id(db, session_id)
    if not s:
        raise HTTPException(404, detail="Session not found")

    async def event_generator():
        cursor = 0.0
        while True:
            rows = get_readings_page(db, session_id, cursor, 200)
            if not rows:
                yield "data: {\"type\": \"stream_end\"}\n\n"
                break
            for row in rows:
                payload = json.dumps({"type": "pid_reading", "payload": _serialize_reading(row)})
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.005 / speed)
            cursor = rows[-1].ts

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _serialize_reading(r) -> dict:
    return {
        "id": r.id,
        "session_id": r.session_id,
        "ts": r.ts,
        "pid": r.pid,
        "name": r.name,
        "value": r.value,
        "unit": r.unit,
        "valid": r.valid,
    }
