from __future__ import annotations

from dataclasses import dataclass

from src.domain.value_objects.evaluation_point import EvaluationPoint
from src.domain.value_objects.integration_bounds import IntegrationBounds


@dataclass(frozen=True, slots=True)
class PanelResult:
    index: int  # 1-based
    start: float
    end: float
    approximation: float


@dataclass(frozen=True, slots=True)
class IntegrationResult:
    method_id: str
    bounds: IntegrationBounds
    panel_count: int
    subinterval_count: int
    panel_width: float
    step: float
    approximation: float
    evaluations: tuple[EvaluationPoint, ...]
    panels: tuple[PanelResult, ...]
    # Unique (x, f(x)) pairs actually evaluated, in evaluation order.
    nodes: tuple[tuple[float, float], ...]

    @property
    def function_evaluations(self) -> int:
        return len(self.nodes)
