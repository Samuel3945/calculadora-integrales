"""Port: turn user text into a validated expression (implemented in infrastructure)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class ParsedExpression:
    """A validated integrand. ``payload`` is an opaque handle for the matching adapters."""

    canonical: str
    latex: str
    variable: str
    payload: Any


@dataclass(frozen=True, slots=True)
class ParsedConstant:
    """A validated variable-free expression (an integration bound) with its real value."""

    value: float
    canonical: str
    latex: str
    payload: Any


class ExpressionParser(ABC):
    @abstractmethod
    def parse(self, text: str, variable: str) -> ParsedExpression:
        """Parse ``text`` using the canonical grammar.

        Raises InvalidVariableError, InvalidExpressionError or ExpressionTooComplexError.
        """

    @abstractmethod
    def parse_constant(self, value: str | int | float) -> ParsedConstant:
        """Parse a bound given as a number or constant expression; must be finite and real.

        Raises the same errors as :meth:`parse` (the use case maps them to INVALID_BOUNDS).
        """
