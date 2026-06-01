import uuid
import time
import logging
from dataclasses import dataclass, field
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..obd.pid_validator import PIDReading

log = logging.getLogger("vehiclepulse.threshold")


@dataclass
class ThresholdRule:
    pid: str
    op: str          # gt | lt | gte | lte | eq | range_outside
    value: float
    severity: str    # info | warning | critical
    cooldown_s: float = 30.0
    range_min: Optional[float] = None  # for range_outside
    range_max: Optional[float] = None


# Sensible defaults — editable via REST
DEFAULT_RULES: list[ThresholdRule] = [
    ThresholdRule("05", "gt",  110.0, "warning",  cooldown_s=30),
    ThresholdRule("05", "gt",  120.0, "critical", cooldown_s=10),
    ThresholdRule("0C", "gt", 6000.0, "warning",  cooldown_s=5),
    ThresholdRule("14", "range_outside", 0.0, "warning", cooldown_s=15, range_min=0.1, range_max=0.9),
    ThresholdRule("15", "range_outside", 0.0, "warning", cooldown_s=15, range_min=0.1, range_max=0.9),
    ThresholdRule("10", "gt",   20.0, "warning",  cooldown_s=10),
    ThresholdRule("04", "gt",   95.0, "warning",  cooldown_s=10),
]


class ThresholdEngine:
    def __init__(self, rules: Optional[list[ThresholdRule]] = None):
        self._rules: list[ThresholdRule] = rules if rules is not None else list(DEFAULT_RULES)
        self._last_triggered: dict[str, float] = {}

    def evaluate(self, reading: "PIDReading", current_values: dict) -> Optional[dict]:
        if not reading.valid or reading.value is None:
            return None

        for rule in self._rules:
            if rule.pid != reading.pid:
                continue

            if not self._check(rule, reading.value):
                continue

            rule_key = f"{rule.pid}:{rule.op}:{rule.value}"
            last = self._last_triggered.get(rule_key, 0.0)
            if time.time() - last < rule.cooldown_s:
                continue

            self._last_triggered[rule_key] = time.time()
            fault_id = str(uuid.uuid4())

            snapshot = {
                pid: {"value": r.value, "unit": r.unit}
                for pid, r in current_values.items()
                if r.valid and r.value is not None
            }

            fault = {
                "id": fault_id,
                "session_id": reading.session_id,
                "ts": reading.ts,
                "pid": reading.pid,
                "pid_name": reading.name,
                "value": reading.value,
                "threshold_op": rule.op,
                "threshold_val": rule.value,
                "severity": rule.severity,
                "freeze_frame_id": None,
            }

            # Persist asynchronously — caller handles this via asyncio
            self._persist_fault(fault, snapshot)

            log.info(
                "fault_triggered pid=%s value=%.2f op=%s threshold=%.2f severity=%s",
                rule.pid, reading.value, rule.op, rule.value, rule.severity,
            )
            return fault

        return None

    def _check(self, rule: ThresholdRule, value: float) -> bool:
        if rule.op == "gt":
            return value > rule.value
        if rule.op == "lt":
            return value < rule.value
        if rule.op == "gte":
            return value >= rule.value
        if rule.op == "lte":
            return value <= rule.value
        if rule.op == "eq":
            return value == rule.value
        if rule.op == "range_outside":
            return not (rule.range_min <= value <= rule.range_max)
        return False

    def _persist_fault(self, fault: dict, snapshot: dict) -> None:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(self._async_persist(fault, snapshot))
        except RuntimeError:
            pass

    async def _async_persist(self, fault: dict, snapshot: dict) -> None:
        from ..db.crud import save_fault_with_freeze_frame
        try:
            save_fault_with_freeze_frame(fault, snapshot)
        except Exception as exc:
            log.error("fault_persist_error %s", exc)

    def get_rules(self) -> list[dict]:
        return [vars(r) for r in self._rules]

    def set_rules(self, rules_data: list[dict]) -> None:
        self._rules = [ThresholdRule(**r) for r in rules_data]
