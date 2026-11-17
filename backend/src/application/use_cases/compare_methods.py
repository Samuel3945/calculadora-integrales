from __future__ import annotations

from src.application.dto import (
    CompareMethodsCommand,
    CompareMethodsOutput,
    MethodComparison,
    MethodError,
    MethodInfo,
)
from src.application.factories.strategy_factory import StrategyFactory
from src.application.ports.expression_parser import ExpressionParser
from src.application.ports.numeric_evaluator import NumericEvaluator
from src.application.ports.symbolic_integrator import ExactResult, ExactStatus, SymbolicIntegrator
from src.application.services import warnings as warning_builders
from src.application.services.error_metrics import compute_errors
from src.application.services.problem_preparation import prepare_problem
from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.exceptions import FunctionEvaluationError
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.value_objects.integration_config import IntegrationConfig


class CompareMethodsUseCase:
    """Runs several rules on the same problem. A rule that cannot be evaluated (e.g. a closed
    rule touching a singular endpoint) is reported as an error row; the others still succeed."""

    def __init__(
        self,
        parser: ExpressionParser,
        evaluator: NumericEvaluator,
        symbolic: SymbolicIntegrator,
        factory: StrategyFactory,
    ) -> None:
        self._parser = parser
        self._evaluator = evaluator
        self._symbolic = symbolic
        self._factory = factory

    def execute(self, command: CompareMethodsCommand) -> CompareMethodsOutput:
        prepared = prepare_problem(
            self._parser,
            self._evaluator,
            command.expression,
            command.variable,
            command.lower_bound,
            command.upper_bound,
        )
        method_ids = list(dict.fromkeys(command.methods)) if command.methods else self._factory.ids()
        strategies = [self._factory.get(method_id) for method_id in method_ids]
        config = IntegrationConfig.create("compare", command.variant, command.panel_count)

        if prepared.problem.bounds.is_degenerate:
            exact = (
                ExactResult(ExactStatus.COMPUTED, 0.0, "0")
                if command.calculate_exact
                else ExactResult(ExactStatus.DISABLED)
            )
            results = [self._zero_row(s, exact) for s in strategies]
            warnings = [warning_builders.equal_bounds()]
        else:
            analysis = self._symbolic.analyze(
                prepared.expression, prepared.lower, prepared.upper, command.calculate_exact
            )
            exact = analysis.exact
            warnings = warning_builders.from_analysis(analysis)
            results = [self._run(s, prepared.problem, config.panel_count, exact) for s in strategies]

        return CompareMethodsOutput(
            expression=prepared.expression_info,
            bounds=prepared.bounds_info,
            variant=str(config.variant),
            panel_count=config.panel_count,
            exact=exact,
            results=results,
            warnings=warnings,
        )

    @staticmethod
    def _zero_row(strategy: IntegrationStrategy, exact: ExactResult) -> MethodComparison:
        absolute, relative = compute_errors(exact, 0.0)
        return MethodComparison(MethodInfo.from_strategy(strategy), "ok", 0.0, absolute, relative, 0, None)

    @staticmethod
    def _run(
        strategy: IntegrationStrategy, problem: IntegrationProblem, panel_count: int, exact: ExactResult
    ) -> MethodComparison:
        info = MethodInfo.from_strategy(strategy)
        try:
            result = strategy.integrate(problem, panel_count)
        except FunctionEvaluationError as exc:
            return MethodComparison(
                info, "error", None, None, None, None, MethodError(exc.code, exc.message, exc.details)
            )
        absolute, relative = compute_errors(exact, result.approximation)
        return MethodComparison(
            info, "ok", result.approximation, absolute, relative, result.function_evaluations, None
        )
