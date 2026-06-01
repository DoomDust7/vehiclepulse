import logging
import time
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db.database import init_db
from .db.crud import ReadingBuffer, create_session, close_session
from .ws.manager import ConnectionManager
from .fault.threshold_engine import ThresholdEngine
from .obd.poller import OBDPoller
from .routers import sessions, replay, export, faults, config_routes

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='{"ts":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","event":"%(message)s"}',
)
log = logging.getLogger("vehiclepulse.main")

_start_time = time.time()
_ws_manager: ConnectionManager = None
_poller: OBDPoller = None
_session_id: str = None
_threshold_engine: ThresholdEngine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ws_manager, _poller, _session_id, _threshold_engine

    init_db(settings.DB_PATH)
    log.info("db_initialized path=%s", settings.DB_PATH)

    _threshold_engine = ThresholdEngine()
    config_routes.set_engine(_threshold_engine)

    _ws_manager = ConnectionManager(settings.WS_BROADCAST_INTERVAL_MS)
    _ws_manager.start()

    db_session = create_session(mock_mode=settings.MOCK_MODE, vehicle_vin=settings.VEHICLE_VIN)
    _session_id = db_session.id
    log.info("session_created id=%s mock=%s", _session_id, settings.MOCK_MODE)

    if settings.MOCK_MODE:
        from .obd.mock_adapter import MockOBDAdapter
        adapter = MockOBDAdapter()
    else:
        from .obd.connector import OBDConnector
        adapter = OBDConnector(settings.SERIAL_PORT, settings.BAUD_RATE)
        if not adapter.connect():
            log.error("obd_connect_failed — falling back to error state")

    reading_buffer = ReadingBuffer(flush_interval_s=1.0)

    _poller = OBDPoller(
        session_id=_session_id,
        adapter=adapter,
        mock_mode=settings.MOCK_MODE,
        threshold_engine=_threshold_engine,
        ws_manager=_ws_manager,
        reading_buffer=reading_buffer,
        poll_rate_hz=settings.POLL_RATE_HZ,
    )
    _poller.start()

    await _ws_manager.broadcast({
        "type": "session_start",
        "payload": {"session_id": _session_id, "mock_mode": settings.MOCK_MODE},
    })

    log.info("poller_started session_id=%s", _session_id)

    yield

    log.info("shutdown session_id=%s", _session_id)
    await _poller.stop()
    await _ws_manager.stop()
    stats = _poller.stats
    close_session(_session_id, stats["total_readings"], stats["total_faults"])


app = FastAPI(title="VehiclePulse", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api/v1")
app.include_router(replay.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(faults.router, prefix="/api/v1")
app.include_router(config_routes.router, prefix="/api/v1")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await _ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _ws_manager.disconnect(websocket)


@app.get("/health")
def health():
    adapter_status = "mock" if settings.MOCK_MODE else "connected"
    return {
        "status": "ok",
        "adapter": adapter_status,
        "session_id": _session_id,
        "uptime_s": round(time.time() - _start_time, 1),
        "ws_clients": _ws_manager.client_count if _ws_manager else 0,
    }
