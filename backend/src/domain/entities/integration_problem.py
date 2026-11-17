from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from src.domain.value_objects.integration_bounds import IntegrationBounds


@dataclass(frozen=True, slots=True)
class IntegrationProblem:
    """What to integrate: the (injected) integrand, its variable name and the bounds."""

    function: Callable[[Sequence[float]], Sequence[float]]
    variable: str
    bounds: IntegrationBounds
