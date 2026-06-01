import math
import random
import time
from typing import Optional
from .pid_registry import PIDDef, PID_DEFINITIONS


class MockOBDAdapter:
    """
    Generates synthetic OBD-II responses for development without hardware.
    Every 60 seconds it injects a deliberately mismatched PID header to
    exercise PIDValidator's stale-response detection.
    """

    def __init__(self):
        self._start = time.time()
        self._last_stale_inject = self._start
        self._dtc_list: list[str] = []
        self._speed = 0.0

    def get_response(self, pid_def: PIDDef) -> bytes:
        # Inject a stale response every 60s — mismatches by returning "0C" bytes for any PID
        now = time.time()
        if now - self._last_stale_inject >= 60.0:
            self._last_stale_inject = now
            # Return RPM-shaped bytes regardless of which PID was asked for
            stale_rpm_bytes = bytes([0x41, 0x0C, 0x1A, 0xF8])
            return stale_rpm_bytes

        elapsed = now - self._start
        return self._synthesize(pid_def, elapsed)

    def _synthesize(self, pid_def: PIDDef, elapsed: float) -> bytes:
        mode_byte = pid_def.mode + 0x40
        pid_byte  = int(pid_def.pid_hex, 16)

        raw = self._sensor_value(pid_def, elapsed)
        data = self._encode(pid_def, raw)
        return bytes([mode_byte, pid_byte]) + data

    def _sensor_value(self, pid_def: PIDDef, elapsed: float) -> float:
        pid = pid_def.pid_hex
        if pid == "0C":  # RPM — sinusoidal 600–3500
            return 600 + 1450 * (1 + math.sin(2 * math.pi * 0.3 * elapsed))
        if pid == "05":  # Coolant — ramp 85→115°C over 2 min then hold
            return min(85 + (elapsed / 120) * 30, 115)
        if pid == "0D":  # Speed — random walk
            self._speed = max(0, min(120, self._speed + random.uniform(-3, 3)))
            return self._speed
        if pid == "10":  # MAF — correlated with RPM
            rpm = 600 + 1450 * (1 + math.sin(2 * math.pi * 0.3 * elapsed))
            return rpm / 1000 * 4.5
        if pid in ("14", "15"):  # O2 sensors — oscillate with noise
            return 0.45 + 0.35 * math.sin(2 * math.pi * 0.8 * elapsed) + random.uniform(-0.05, 0.05)
        if pid == "11":  # Throttle — step function
            step = int(elapsed / 10) % 5
            return [5, 20, 40, 60, 15][step]
        if pid == "04":  # Engine load
            return 30 + 20 * math.sin(2 * math.pi * 0.15 * elapsed)
        if pid == "0B":  # MAP kPa
            return 50 + 30 * math.sin(2 * math.pi * 0.1 * elapsed)
        if pid == "0F":  # Intake temp
            return 25 + random.uniform(-2, 2)
        if pid == "06":  # Short-term fuel trim
            return random.uniform(-5, 5)
        return 0.0

    def _encode(self, pid_def: PIDDef, value: float) -> bytes:
        pid = pid_def.pid_hex
        if pid == "0C":  # RPM: A*256+B / 4
            raw = int(value * 4) & 0xFFFF
            return bytes([raw >> 8, raw & 0xFF])
        if pid in ("05", "0F"):  # temp: A - 40
            return bytes([max(0, min(255, int(value + 40)))])
        if pid == "10":  # MAF: (A*256+B)/100
            raw = int(value * 100) & 0xFFFF
            return bytes([raw >> 8, raw & 0xFF])
        if pid in ("14", "15"):  # O2: A/200
            return bytes([max(0, min(255, int(value * 200))), 0xFF])
        if pid in ("04", "11"):  # percent: A*100/255
            return bytes([max(0, min(255, int(value * 255 / 100)))])
        # single byte passthrough (speed, MAP, throttle variants)
        return bytes([max(0, min(255, int(value)))])

    def inject_dtc(self, code: str) -> None:
        if code not in self._dtc_list:
            self._dtc_list.append(code)

    def get_dtc_response(self) -> list[str]:
        return list(self._dtc_list)

    @property
    def connected(self) -> bool:
        return True
