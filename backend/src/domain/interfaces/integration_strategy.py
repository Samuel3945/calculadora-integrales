from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable, Sequence
from enum import StrEnum

from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.entities.integration_result import IntegrationResult

# Vectorised integrand: receives the unique nodes, returns f at each of them.
# Implementations must raise FunctionEvaluationError when f is not finite and real.
FunctionEvaluator = Callable[[Sequence[float]], Sequence[float]]


class Family(StrEnum):
    CLOSED = "closed"
    OPEN = "open"


class IntegrationStrategy(ABC):
    """Contract of a Newton-Cotes style rule applied panel by panel."""

    id: str
    family: Family
    degree_of_exactness: int
    subintervals_per_panel: int
    formula_latex: str

    @property
    @abstractmethod
    def local_nodes(self) -> tuple[int, ...]:
        """Node positions inside a panel, in units of ``h`` from the panel start."""

    @property
    @abstractmethod
    def local_weights(self) -> tuple[float, ...]:
        """Weights in units of ``h`` (so that ``sum(weights) * h == W``)."""

    @property
    def error_order(self) -> int:
        return self.degree_of_exactness + 1

    @property
    def nodes_per_panel(self) -> int:
        return len(self.local_nodes)

    @abstractmethod
    def integrate(self, problem: IntegrationProblem, panel_count: int) -> IntegrationResult:
        """Apply the rule on ``panel_count`` panels of ``problem``."""
