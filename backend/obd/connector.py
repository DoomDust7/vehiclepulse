import logging
import time
from enum import Enum
from typing import Optional

log = logging.getLogger("vehiclepulse.connector")

try:
    import obd
    _OBD_AVAILABLE = True
except ImportError:
    _OBD_AVAILABLE = False


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class OBDConnector:
    """
    Manages the python-obd connection lifecycle with a circuit breaker.
    After 3 consecutive failures → OPEN state, exponential-backoff retry.
    """

    _FAILURE_THRESHOLD = 3
    _BACKOFF_STEPS = [5, 10, 30, 60]

    def __init__(self, port: str, baud_rate: int):
        self._port = port
        self._baud_rate = baud_rate
        self._connection = None
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_open_ts: float = 0.0
        self._backoff_idx = 0

    def connect(self) -> bool:
        if not _OBD_AVAILABLE:
            log.error("python-obd not installed; use MOCK_MODE=true")
            return False
        try:
            self._connection = obd.OBD(portstr=self._port, baudrate=self._baud_rate, fast=False)
            if self._connection.is_connected():
                # Enable response headers so PIDValidator can inspect mode+PID bytes
                self._connection.query(obd.commands["AT_H1"])
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                self._backoff_idx = 0
                log.info("obd_connected port=%s", self._port)
                return True
            self._handle_failure("not_connected")
            return False
        except Exception as exc:
            self._handle_failure(str(exc))
            return False

    def disconnect(self) -> None:
        if self._connection:
            try:
                self._connection.close()
            except Exception:
                pass
            self._connection = None

    def query_raw(self, pid_hex: str, mode: int = 1) -> Optional[bytes]:
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_open_ts >= self._retry_delay():
                self._state = CircuitState.HALF_OPEN
            else:
                return None

        try:
            cmd = obd.commands[f"MODE_{mode:02X}_PID_{pid_hex}"]
            resp = self._connection.query(cmd, force=True)
            if resp.is_null():
                self._handle_failure("null_response")
                return None
            self._failure_count = 0
            self._state = CircuitState.CLOSED
            return bytes(resp.raw_response) if resp.raw_response else None
        except Exception as exc:
            self._handle_failure(str(exc))
            return None

    def _handle_failure(self, reason: str) -> None:
        self._failure_count += 1
        log.warning("obd_failure reason=%s count=%d", reason, self._failure_count)
        if self._failure_count >= self._FAILURE_THRESHOLD:
            self._state = CircuitState.OPEN
            self._last_open_ts = time.time()
            log.error("circuit_open — adapter disconnected")

    def _retry_delay(self) -> float:
        delay = self._BACKOFF_STEPS[min(self._backoff_idx, len(self._BACKOFF_STEPS) - 1)]
        self._backoff_idx += 1
        return delay

    @property
    def is_connected(self) -> bool:
        return self._connection is not None and self._connection.is_connected()

    @property
    def circuit_state(self) -> CircuitState:
        return self._state
