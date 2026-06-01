from dataclasses import dataclass
from typing import Callable


@dataclass
class PIDDef:
    pid_hex: str       # e.g. "0C"
    name: str
    mode: int          # SAE J1979 mode (1 = current data)
    bytes_returned: int
    formula: Callable[[bytes], float]
    unit: str
    min_val: float
    max_val: float


def _rpm(b: bytes) -> float:
    return ((b[0] * 256) + b[1]) / 4.0


def _temp(b: bytes) -> float:
    return b[0] - 40.0


def _percent(b: bytes) -> float:
    return b[0] * 100.0 / 255.0


def _map_kpa(b: bytes) -> float:
    return float(b[0])


def _speed(b: bytes) -> float:
    return float(b[0])


def _maf(b: bytes) -> float:
    return ((b[0] * 256) + b[1]) / 100.0


def _throttle(b: bytes) -> float:
    return b[0] * 100.0 / 255.0


def _o2_voltage(b: bytes) -> float:
    return b[0] / 200.0


def _fuel_trim(b: bytes) -> float:
    return (b[0] - 128) * 100.0 / 128.0


PID_DEFINITIONS: list[PIDDef] = [
    PIDDef("04", "ENGINE_LOAD",    1, 1, _percent,   "%",   0,   100),
    PIDDef("05", "COOLANT_TEMP",   1, 1, _temp,      "C",  -40,  215),
    PIDDef("06", "STFT_BANK1",     1, 1, _fuel_trim, "%",  -100, 100),
    PIDDef("0B", "INTAKE_MAP",     1, 1, _map_kpa,   "kPa", 0,   255),
    PIDDef("0C", "RPM",            1, 2, _rpm,        "rpm", 0,  16383),
    PIDDef("0D", "SPEED",          1, 1, _speed,      "km/h", 0, 255),
    PIDDef("0F", "INTAKE_TEMP",    1, 1, _temp,      "C",  -40,  215),
    PIDDef("10", "MAF",            1, 2, _maf,       "g/s",  0,  655),
    PIDDef("11", "THROTTLE_POS",   1, 1, _throttle,  "%",   0,   100),
    PIDDef("14", "O2_SENSOR_1",    1, 2, _o2_voltage, "V",  0,   1.275),
    PIDDef("15", "O2_SENSOR_2",    1, 2, _o2_voltage, "V",  0,   1.275),
]

PID_MAP: dict[str, PIDDef] = {p.pid_hex: p for p in PID_DEFINITIONS}
