from __future__ import annotations

import math
from dataclasses import dataclass

from src.domain.exceptions import InvalidBoundsError


@dataclass(frozen=True, slots=True)
class IntegrationBounds:
    """Finite real integration limits. ``lower > upper`` is allowed (signed integral)."""

    lower: float
    upper: float

    def __post_init__(self) -> None:
        for name, value in (("lower", self.lower), ("upper", self.upper)):
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise InvalidBoundsError(f"{name} bound must be a finite real number", {"bound": name})

    @property
    def is_degenerate(self) -> bool:
        return self.lower == self.upper

    @property
    def span(self) -> float:
        return self.upper - self.lower

    @property
    def low(self) -> float:
        return min(self.lower, self.upper)

    @property
    def high(self) -> float:
        return max(self.lower, self.upper)
