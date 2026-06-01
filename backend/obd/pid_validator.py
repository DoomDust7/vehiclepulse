import logging
import time
from dataclasses import dataclass, field
from typing import Optional
from .pid_registry import PIDDef

log = logging.getLogger("vehiclepulse.stale_response")


@dataclass
class PIDReading:
    session_id: str
    ts: float
    pid: str
    name: str
    value: Optional[float]
    unit: str
    raw_bytes: str
    valid: bool


class PIDValidator:
    """
    Cross-checks the mode+PID bytes in an ELM327 raw response against the
    issued command before decoding.  Prevents stale responses from a previous
    PID query being decoded as the current one.
    """

    def validate(
        self,
        session_id: str,
        pid_def: PIDDef,
        raw_response: bytes,
    ) -> PIDReading:
        raw_hex = raw_response.hex(" ").upper()
        ts = time.time()

        if len(raw_response) < 2 + pid_def.bytes_returned:
            log.warning(
                "short_response",
                extra={"pid": pid_def.pid_hex, "raw": raw_hex, "session_id": session_id},
            )
            return PIDReading(session_id=session_id, ts=ts, pid=pid_def.pid_hex,
                              name=pid_def.name, value=None, unit=pid_def.unit,
                              raw_bytes=raw_hex, valid=False)

        expected_mode = pid_def.mode + 0x40   # mode 01 → 0x41
        expected_pid  = int(pid_def.pid_hex, 16)

        got_mode = raw_response[0]
        got_pid  = raw_response[1]

        if got_mode != expected_mode or got_pid != expected_pid:
            log.warning(
                "stale_response pid=%s expected_mode=0x%02X expected_pid=0x%02X "
                "got_mode=0x%02X got_pid=0x%02X raw=%s session_id=%s",
                pid_def.pid_hex, expected_mode, expected_pid,
                got_mode, got_pid, raw_hex, session_id,
            )
            return PIDReading(session_id=session_id, ts=ts, pid=pid_def.pid_hex,
                              name=pid_def.name, value=None, unit=pid_def.unit,
                              raw_bytes=raw_hex, valid=False)

        data_bytes = raw_response[2: 2 + pid_def.bytes_returned]
        try:
            value = pid_def.formula(data_bytes)
        except Exception as exc:
            log.error("decode_error pid=%s raw=%s error=%s", pid_def.pid_hex, raw_hex, exc)
            return PIDReading(session_id=session_id, ts=ts, pid=pid_def.pid_hex,
                              name=pid_def.name, value=None, unit=pid_def.unit,
                              raw_bytes=raw_hex, valid=False)

        return PIDReading(
            session_id=session_id,
            ts=ts,
            pid=pid_def.pid_hex,
            name=pid_def.name,
            value=value,
            unit=pid_def.unit,
            raw_bytes=raw_hex,
            valid=True,
        )
