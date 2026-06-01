from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..fault.threshold_engine import ThresholdRule

router = APIRouter(prefix="/config", tags=["config"])

# Injected at startup by main.py
_threshold_engine = None


def set_engine(engine):
    global _threshold_engine
    _threshold_engine = engine


class RuleIn(BaseModel):
    pid: str
    op: str
    value: float
    severity: str
    cooldown_s: float = 30.0
    range_min: Optional[float] = None
    range_max: Optional[float] = None


@router.get("/thresholds")
def get_thresholds():
    return _threshold_engine.get_rules()


@router.put("/thresholds")
def set_thresholds(rules: list[RuleIn]):
    _threshold_engine.set_rules([r.model_dump() for r in rules])
    return {"updated": len(rules)}
