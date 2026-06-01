from dataclasses import dataclass
from typing import Optional

# Subset of SAE J1979 / ISO 15031-6 DTC definitions
_DTC_TABLE: dict[str, tuple[str, str, str]] = {
    "P0100": ("Mass Air Flow Circuit Malfunction", "fuel_air", "warning"),
    "P0101": ("Mass Air Flow Circuit Range/Performance", "fuel_air", "warning"),
    "P0110": ("Intake Air Temperature Circuit Malfunction", "fuel_air", "info"),
    "P0115": ("Engine Coolant Temperature Circuit Malfunction", "cooling", "warning"),
    "P0116": ("Engine Coolant Temperature Circuit Range/Performance", "cooling", "warning"),
    "P0117": ("Engine Coolant Temperature Circuit Low Input", "cooling", "critical"),
    "P0118": ("Engine Coolant Temperature Circuit High Input", "cooling", "critical"),
    "P0120": ("Throttle Position Sensor/Switch A Circuit Malfunction", "throttle", "warning"),
    "P0130": ("O2 Sensor Circuit Malfunction Bank 1 Sensor 1", "oxygen", "warning"),
    "P0131": ("O2 Sensor Circuit Low Voltage Bank 1 Sensor 1", "oxygen", "warning"),
    "P0132": ("O2 Sensor Circuit High Voltage Bank 1 Sensor 1", "oxygen", "warning"),
    "P0133": ("O2 Sensor Circuit Slow Response Bank 1 Sensor 1", "oxygen", "info"),
    "P0134": ("O2 Sensor Circuit No Activity Detected Bank 1 Sensor 1", "oxygen", "critical"),
    "P0135": ("O2 Sensor Heater Circuit Malfunction Bank 1 Sensor 1", "oxygen", "warning"),
    "P0171": ("System Too Lean Bank 1", "fuel_air", "warning"),
    "P0172": ("System Too Rich Bank 1", "fuel_air", "warning"),
    "P0300": ("Random/Multiple Cylinder Misfire Detected", "ignition", "critical"),
    "P0301": ("Cylinder 1 Misfire Detected", "ignition", "critical"),
    "P0302": ("Cylinder 2 Misfire Detected", "ignition", "critical"),
    "P0303": ("Cylinder 3 Misfire Detected", "ignition", "critical"),
    "P0304": ("Cylinder 4 Misfire Detected", "ignition", "critical"),
    "P0401": ("EGR Flow Insufficient Detected", "emissions", "warning"),
    "P0420": ("Catalyst System Efficiency Below Threshold Bank 1", "emissions", "warning"),
    "P0440": ("Evaporative Emission Control System Malfunction", "emissions", "info"),
    "P0500": ("Vehicle Speed Sensor Malfunction", "transmission", "warning"),
    "P0505": ("Idle Control System Malfunction", "fuel_air", "warning"),
    "P0600": ("Serial Communication Link Malfunction", "electronics", "critical"),
    "P0700": ("Transmission Control System Malfunction", "transmission", "warning"),
}


@dataclass
class DTCInfo:
    code: str
    description: str
    system: str
    severity: str


class DTCDecoder:
    def decode(self, dtc_code: str) -> DTCInfo:
        code = dtc_code.upper().strip()
        if code in _DTC_TABLE:
            desc, system, severity = _DTC_TABLE[code]
        else:
            desc = f"Unknown DTC: {code}"
            system = "unknown"
            severity = "info"
        return DTCInfo(code=code, description=desc, system=system, severity=severity)

    def decode_many(self, codes: list[str]) -> list[DTCInfo]:
        return [self.decode(c) for c in codes]
