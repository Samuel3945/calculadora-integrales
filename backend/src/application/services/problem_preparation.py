"""Shared front half of the use cases: parse, validate and compile the problem."""

from __future__ import annotations

from dataclasses import dataclass

from src.application.dto import Bound, BoundsInfo, ExpressionInfo
from src.application.ports.expression_parser import ExpressionParser, ParsedConstant, ParsedExpression
from src.application.ports.numeric_evaluator import CompiledFunction, NumericEvaluator
from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.exceptions import IntegrationError, InvalidBoundsError
from src.domain.value_objects.integration_bounds import IntegrationBounds


@dataclass(frozen=True, slots=True)
class PreparedProblem:
    expression: ParsedExpression
    lower: ParsedConstant
    upper: ParsedConstant
    compiled: CompiledFunction
    problem: IntegrationProblem

    @property
    def expression_info(self) -> ExpressionInfo:
        return ExpressionInfo(self.expression.canonical, self.expression.latex, self.expression.variable)

    @property
    def bounds_info(self) -> BoundsInfo:
        return BoundsInfo(self.lower.value, self.upper.value, self.lower.latex, self.upper.latex)


def _parse_bound(parser: ExpressionParser, value: Bound, name: str) -> ParsedConstant:
    try:
        return parser.parse_constant(value)
    except IntegrationError as exc:
        raise InvalidBoundsError(
            f"{name} bound is not a valid finite real constant: {exc.message}", {"bound": name}
        ) from exc


def prepare_problem(
    parser: ExpressionParser,
    evaluator: NumericEvaluator,
    expression: str,
    variable: str,
    lower_bound: Bound,
    upper_bound: Bound,
) -> PreparedProblem:
    parsed = parser.parse(expression, variable)
    lower = _parse_bound(parser, lower_bound, "lower")
    upper = _parse_bound(parser, upper_bound, "upper")
    compiled = evaluator.compile(parsed)
    bounds = IntegrationBounds(lower.value, upper.value)
    problem = IntegrationProblem(compiled.evaluate, variable, bounds)
    return PreparedProblem(parsed, lower, upper, compiled, problem)
