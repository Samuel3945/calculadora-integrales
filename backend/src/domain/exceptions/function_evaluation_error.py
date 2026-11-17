from __future__ import annotations

from typing import ClassVar

from src.domain.exceptions.integration_error import IntegrationError

REASONS = ("nan", "infinite", "domain", "division_by_zero")


class FunctionEvaluationError(IntegrationError):
    """The integrand is not a finite real number at a node that the rule requires."""

    code: ClassVar[str] = "FUNCTION_EVALUATION_ERROR"

    def __init__(self, x: float, reason: str) -> None:
        super().__init__(f"f is not real-valued at x = {x!r} ({reason})", {"x": x, "reason": reason})
        self.x = x
        self.reason = reason
