"""Port: optional symbolic analysis (exact integral + singularity check)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import StrEnum

from src.application.ports.expression_parser import ParsedConstant, ParsedExpression


class ExactStatus(StrEnum):
    COMPUTED = "computed"
    DISABLED = "disabled"
    UNAVAILABLE = "unavailable"
    TIMEOUT = "timeout"


@dataclass(frozen=True, slots=True)
class ExactResult:
    status: ExactStatus
    value: float | None = None
    latex: str | None = None


@dataclass(frozen=True, slots=True)
class SymbolicAnalysis:
    exact: ExactResult
    singular_points: tuple[float, ...] = field(default_factory=tuple)


class SymbolicIntegrator(ABC):
    @abstractmethod
    def analyze(
        self,
        expression: ParsedExpression,
        lower: ParsedConstant,
        upper: ParsedConstant,
        compute_exact: bool,
    ) -> SymbolicAnalysis:
        """Best-effort symbolic work. Must never raise for mathematical difficulties and must
        be bounded in time. When ``compute_exact`` is False, ``exact.status`` is DISABLED."""
