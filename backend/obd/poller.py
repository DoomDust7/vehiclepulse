import asyncio
import logging
import time
from typing import Optional, TYPE_CHECKING

from .pid_registry import PID_DEFINITIONS, PIDDef
from .pid_validator import PIDValidator, PIDReading

if TYPE_CHECKING:
    from ..fault.threshold_engine import ThresholdEngine
    from ..ws.manager import ConnectionManager
    from ..db.crud import ReadingBuffer
    from .mock_adapter import MockOBDAdapter
    from .connector import OBDConnector

log = logging.getLogger("vehiclepulse.poller")


class OBDPoller:
    """
    Async polling loop that queries PIDs round-robin at ~10Hz total throughput.
    All responses pass through PIDValidator before any downstream processing.
    Hot path (WS broadcast) and cold path (DB write) are decoupled via asyncio.Queue.
    """

    QUEUE_MAX = 500

    def __init__(
        self,
        session_id: str,
        adapter,               # OBDConnector | MockOBDAdapter
        mock_mode: bool,
        threshold_engine: "ThresholdEngine",
        ws_manager: "ConnectionManager",
        reading_buffer: "ReadingBuffer",
        poll_rate_hz: float = 10.0,
    ):
        self._session_id = session_id
        self._adapter = adapter
        self._mock_mode = mock_mode
        self._threshold_engine = threshold_engine
        self._ws_manager = ws_manager
        self._reading_buffer = reading_buffer
        self._poll_interval = 1.0 / poll_rate_hz
        self._validator = PIDValidator()
        self._current_values: dict[str, PIDReading] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._total_readings = 0
        self._total_faults = 0

    def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._reading_buffer.flush_now()

    async def _poll_loop(self) -> None:
        pid_list = list(PID_DEFINITIONS)
        idx = 0
        cycle_budget = self._poll_interval

        while self._running:
            t0 = time.monotonic()
            pid_def = pid_list[idx % len(pid_list)]
            idx += 1

            reading = await asyncio.get_event_loop().run_in_executor(
                None, self._poll_one, pid_def
            )

            if reading:
                self._current_values[reading.pid] = reading
                self._total_readings += 1
                await self._dispatch(reading)

            elapsed = time.monotonic() - t0
            sleep_for = max(0.0, cycle_budget - elapsed)
            await asyncio.sleep(sleep_for)

    def _poll_one(self, pid_def: PIDDef) -> Optional[PIDReading]:
        if self._mock_mode:
            raw = self._adapter.get_response(pid_def)
        else:
            raw = self._adapter.query_raw(pid_def.pid_hex, pid_def.mode)

        if raw is None:
            return None

        return self._validator.validate(self._session_id, pid_def, raw)

    async def _dispatch(self, reading: PIDReading) -> None:
        reading_dict = {
            "id": __import__("uuid").uuid4().__str__(),
            "session_id": reading.session_id,
            "ts": reading.ts,
            "pid": reading.pid,
            "name": reading.name,
            "value": reading.value,
            "unit": reading.unit,
            "raw_bytes": reading.raw_bytes,
            "valid": reading.valid,
        }

        # Cold path: buffer for DB batch write
        try:
            await self._reading_buffer.add(reading_dict)
        except Exception as exc:
            log.warning("buffer_error %s", exc)

        if not reading.valid:
            return

        # Hot path: broadcast to WS clients
        ws_msg = {"type": "pid_reading", "payload": {
            "session_id": reading.session_id,
            "ts": reading.ts,
            "pid": reading.pid,
            "name": reading.name,
            "value": reading.value,
            "unit": reading.unit,
            "valid": reading.valid,
        }}
        await self._ws_manager.broadcast(ws_msg)

        # Fault detection
        fault = self._threshold_engine.evaluate(reading, self._current_values)
        if fault:
            self._total_faults += 1
            await self._ws_manager.broadcast({"type": "fault_event", "payload": fault})

    @property
    def stats(self) -> dict:
        return {
            "total_readings": self._total_readings,
            "total_faults": self._total_faults,
            "queue_depth": 0,
        }
