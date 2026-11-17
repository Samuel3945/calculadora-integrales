from __future__ import annotations

from src.application.dto import (
    CalculateIntegralCommand,
    CalculateIntegralOutput,
    EstimatedError,
    MethodInfo,
    ResultWarning,
)
from src.application.factories.strategy_factory import StrategyFactory
from src.application.ports.expression_parser import ExpressionParser
from src.application.ports.numeric_evaluator import NumericEvaluator
from src.application.ports.symbolic_integrator import (
    ExactResult,
    ExactStatus,
    SymbolicIntegrator,
)
from src.application.services import warnings as warning_builders
from src.application.services.error_metrics import compute_errors
from src.application.services.graph_builder import build_empty_graph, build_graph
from src.application.services.problem_preparation import PreparedProblem, prepare_problem
from src.application.services.richardson import richardson_estimate
from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.exceptions import IntegrationError
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.value_objects.integration_config import IntegrationConfig


class CalculateIntegralUseCase:
    """Validate -> parse -> pick strategy -> compute numerically -> (optional) exact/graph/estimate.

    The numeric result never depends on the symbolic engine: the exact integral only feeds the
    error fields and can fail or time out without affecting ``approximation``."""

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

    def execute(self, command: CalculateIntegralCommand) -> CalculateIntegralOutput:
        prepared = prepare_problem(
            self._parser,
            self._evaluator,
            command.expression,
            command.variable,
            command.lower_bound,
            command.upper_bound,
        )
        strategy = self._factory.get(command.method)
        config = IntegrationConfig.create(command.method, command.variant, command.panel_count)
        options = command.options
        bounds = prepared.problem.bounds

        if bounds.is_degenerate:
            return self._degenerate(command, prepared, strategy, config)

        result = strategy.integrate(prepared.problem, config.panel_count)
        analysis = self._symbolic.analyze(
            prepared.expression, prepared.lower, prepared.upper, options.calculate_exact
        )
        warnings = warning_builders.from_analysis(analysis)
        absolute_error, relative_error = compute_errors(analysis.exact, result.approximation)

        estimated: EstimatedError | None = None
        if options.estimate_error:
            estimated = self._estimate(strategy, prepared.problem, config.panel_count, result.approximation, warnings)

        graph = (
            build_graph(prepared.compiled, strategy, result, options.graph_points)
            if options.generate_graph
            else None
        )
        return CalculateIntegralOutput(
            method=MethodInfo.from_strategy(strategy),
            variant=str(config.variant),
            expression=prepared.expression_info,
            bounds=prepared.bounds_info,
            panel_count=result.panel_count,
            subinterval_count=result.subinterval_count,
            panel_width=result.panel_width,
            step=result.step,
            approximation=result.approximation,
            exact=analysis.exact,
            absolute_error=absolute_error,
            relative_error=relative_error,
            estimated_error=estimated,
            function_evaluations=result.function_evaluations,
            evaluations=result.evaluations,
            panels=result.panels,
            graph=graph,
            warnings=warnings,
        )

    @staticmethod
    def _estimate(
        strategy: IntegrationStrategy,
        problem: IntegrationProblem,
        panel_count: int,
        approximation: float,
        warnings: list[ResultWarning],
    ) -> EstimatedError | None:
        try:
            return richardson_estimate(strategy, problem, panel_count, approximation)
        except IntegrationError as exc:
            warnings.append(warning_builders.estimate_unavailable(exc.code))
            return None

    @staticmethod
    def _degenerate(
        command: CalculateIntegralCommand,
        prepared: PreparedProblem,
        strategy: IntegrationStrategy,
        config: IntegrationConfig,
    ) -> CalculateIntegralOutput:
        options = command.options
        exact = (
            ExactResult(ExactStatus.COMPUTED, 0.0, "0")
            if options.calculate_exact
            else ExactResult(ExactStatus.DISABLED)
        )
        absolute_error, relative_error = compute_errors(exact, 0.0)
        graph = (
            build_empty_graph(prepared.compiled, prepared.problem.bounds, options.graph_points)
            if options.generate_graph
            else None
        )
        return CalculateIntegralOutput(
            method=MethodInfo.from_strategy(strategy),
            variant=str(config.variant),
            expression=prepared.expression_info,
            bounds=prepared.bounds_info,
            panel_count=config.panel_count,
            subinterval_count=config.panel_count * strategy.subintervals_per_panel,
            panel_width=0.0,
            step=0.0,
            approximation=0.0,
            exact=exact,
            absolute_error=absolute_error,
            relative_error=relative_error,
            estimated_error=None,
            function_evaluations=0,
            evaluations=(),
            panels=(),
            graph=graph,
            warnings=[warning_builders.equal_bounds()],
        )

