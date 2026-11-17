"""Errors raised while interpreting a request (expression, variable, method, variant)."""

from __future__ import annotations

from typing import ClassVar

from src.domain.exceptions.integration_error import IntegrationError


class InvalidExpressionError(IntegrationError):
    code: ClassVar[str] = "INVALID_EXPRESSION"


class ExpressionTooComplexError(IntegrationError):
    code: ClassVar[str] = "EXPRESSION_TOO_COMPLEX"


class InvalidVariableError(IntegrationError):
    code: ClassVar[str] = "INVALID_VARIABLE"


class UnknownMethodError(IntegrationError):
    code: ClassVar[str] = "UNKNOWN_METHOD"


class UnknownVariantError(IntegrationError):
    code: ClassVar[str] = "UNKNOWN_VARIANT"
