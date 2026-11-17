from __future__ import annotations

from src.application.dto import MethodError, ValidateExpressionOutput
from src.application.ports.expression_parser import ExpressionParser
from src.domain.exceptions import IntegrationError


class ValidateExpressionUseCase:
    def __init__(self, parser: ExpressionParser) -> None:
        self._parser = parser

    def execute(self, expression: str, variable: str = "x") -> ValidateExpressionOutput:
        try:
            parsed = self._parser.parse(expression, variable)
        except IntegrationError as exc:
            return ValidateExpressionOutput(
                False, None, None, MethodError(exc.code, exc.message, exc.details)
            )
        return ValidateExpressionOutput(True, parsed.canonical, parsed.latex, None)
