from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EvaluationPoint:
    """One (panel, node) row of the numerical procedure.

    ``index`` and ``panel`` are 1-based. ``weight`` is the absolute (signed) weight
    ``local_weight * h``. ``shared`` is True when the node is used by two adjacent panels.
    """

    index: int
    panel: int
    x: float
    fx: float
    weight: float
    contribution: float
    shared: bool
