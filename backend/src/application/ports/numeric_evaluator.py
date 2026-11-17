"""Port: fast numeric evaluation of a parsed integrand."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from src.application.ports.expression_parser import ParsedExpression


class CompiledFunction(ABC):
    @abstractmethod
    def evaluate(self, xs: Sequence[float]) -> list[float]:
        """Strict evaluation: raises FunctionEvaluationError at the first non-finite/complex value."""

    @abstractmethod
    def sample(self, xs: Sequence[float]) -> list[float | None]:
        """Lenient evaluation for plotting: ``None`` where f is undefined or non-finite."""


class NumericEvaluator(ABC):
    @abstractmethod
    def compile(self, expression: ParsedExpression) -> CompiledFunction: ...
