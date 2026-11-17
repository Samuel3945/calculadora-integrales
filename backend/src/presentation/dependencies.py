"""Composition root: wires adapters into use cases and exposes them to FastAPI."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Request

from src.application.factories.strategy_factory import StrategyFactory
from src.application.ports.expression_parser import ExpressionParser
from src.application.ports.numeric_evaluator import NumericEvaluator
from src.application.ports.symbolic_integrator import SymbolicIntegrator
from src.application.use_cases.calculate_integral import CalculateIntegralUseCase
from src.application.use_cases.compare_methods import CompareMethodsUseCase
from src.application.use_cases.validate_expression import ValidateExpressionUseCase
from src.infrastructure.numerical.numpy_evaluator import NumpyEvaluator
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser
from src.infrastructure.symbolic.sympy_integrator import SympyIntegrator
from src.infrastructure.symbolic.thread_integrator import ThreadSympyIntegrator
from src.presentation.settings import Settings


@dataclass(frozen=True)
class Container:
    parser: ExpressionParser
    evaluator: NumericEvaluator
    symbolic: SymbolicIntegrator
    factory: StrategyFactory


def build_symbolic(settings: Settings) -> SymbolicIntegrator:
    if settings.resolved_symbolic_mode == "thread":
        return ThreadSympyIntegrator(settings.symbolic_timeout_seconds)
    return SympyIntegrator(settings.symbolic_timeout_seconds)


def build_container(settings: Settings) -> Container:
    return Container(
        parser=SympyExpressionParser(),
        evaluator=NumpyEvaluator(),
        symbolic=build_symbolic(settings),
        factory=StrategyFactory.default(),
    )


def get_container(request: Request) -> Container:
    return request.app.state.container  # type: ignore[no-any-return]


def get_factory(container: Container = Depends(get_container)) -> StrategyFactory:
    return container.factory


def get_calculate_use_case(container: Container = Depends(get_container)) -> CalculateIntegralUseCase:
    return CalculateIntegralUseCase(container.parser, container.evaluator, container.symbolic, container.factory)


def get_compare_use_case(container: Container = Depends(get_container)) -> CompareMethodsUseCase:
    return CompareMethodsUseCase(container.parser, container.evaluator, container.symbolic, container.factory)


def get_validate_use_case(container: Container = Depends(get_container)) -> ValidateExpressionUseCase:
    return ValidateExpressionUseCase(container.parser)
