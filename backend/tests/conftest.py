from __future__ import annotations

import pytest

from src.application.factories.strategy_factory import StrategyFactory
from src.application.ports.expression_parser import ParsedConstant, ParsedExpression
from src.application.ports.symbolic_integrator import (
    ExactResult,
    ExactStatus,
    SymbolicAnalysis,
    SymbolicIntegrator,
)
from src.infrastructure.numerical.numpy_evaluator import NumpyEvaluator
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser


class FakeSymbolic(SymbolicIntegrator):
    """Deterministic stand-in so use-case tests do not spawn processes."""

    def __init__(self, exact: ExactResult | None = None, points: tuple[float, ...] = ()) -> None:
        self.exact = exact or ExactResult(ExactStatus.UNAVAILABLE)
        self.points = points
        self.calls = 0

    def analyze(
        self, expression: ParsedExpression, lower: ParsedConstant, upper: ParsedConstant, compute_exact: bool
    ) -> SymbolicAnalysis:
        self.calls += 1
        exact = self.exact if compute_exact else ExactResult(ExactStatus.DISABLED)
        return SymbolicAnalysis(exact, self.points)


@pytest.fixture(scope="session")
def parser() -> SympyExpressionParser:
    return SympyExpressionParser()


@pytest.fixture(scope="session")
def evaluator() -> NumpyEvaluator:
    return NumpyEvaluator()


@pytest.fixture(scope="session")
def factory() -> StrategyFactory:
    return StrategyFactory.default()
