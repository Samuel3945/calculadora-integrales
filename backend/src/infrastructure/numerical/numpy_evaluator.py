"""NumPy evaluation of a parsed (already whitelisted) SymPy tree."""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Any

import numpy as np
import sympy

from src.application.ports.expression_parser import ParsedExpression
from src.application.ports.numeric_evaluator import CompiledFunction, NumericEvaluator
from src.domain.exceptions import FunctionEvaluationError
from src.infrastructure.parsers.sympy_expression_parser import make_symbol


class _LambdifiedFunction(CompiledFunction):
    def __init__(self, expr: Any, variable: str) -> None:
        self._fn = sympy.lambdify(make_symbol(variable), expr, modules="numpy")
        self._has_pole = any(
            (p.exp.is_number is False or p.exp.is_negative) for p in expr.atoms(sympy.Pow)
        ) or expr.has(sympy.tan)
        self._has_log = expr.has(sympy.log)
        self._has_domain_limit = (
            expr.has(sympy.log, sympy.asin, sympy.acos)
            or any(p.exp.is_integer is not True for p in expr.atoms(sympy.Pow))
        )

    # -- raw evaluation --------------------------------------------------------------------
    def _raw(self, xs: Sequence[float]) -> tuple[np.ndarray, dict[int, str]]:
        """Complex128 values for ``xs`` plus reasons for points where Python-level errors hit."""
        arr = np.asarray(xs, dtype=np.float64)
        forced: dict[int, str] = {}
        with np.errstate(all="ignore"):
            try:
                out = np.broadcast_to(np.asarray(self._fn(arr), dtype=np.complex128), arr.shape).copy()
            except (ZeroDivisionError, OverflowError, ValueError, TypeError, FloatingPointError):
                out = np.full(arr.shape, np.nan, dtype=np.complex128)
                for i, x in enumerate(arr):
                    try:
                        out[i] = complex(self._fn(float(x)))
                    except ZeroDivisionError:
                        forced[i] = "division_by_zero"
                    except (OverflowError, ValueError, TypeError, FloatingPointError):
                        forced[i] = "domain"
        return out, forced

    def _reason(self, value: complex) -> str:
        if value.imag != 0:
            return "domain"
        if math.isnan(value.real):
            return "domain" if self._has_domain_limit else "nan"
        if self._has_pole:
            return "division_by_zero"
        return "domain" if self._has_log else "infinite"

    # -- CompiledFunction ------------------------------------------------------------------
    def evaluate(self, xs: Sequence[float]) -> list[float]:
        values, forced = self._raw(xs)
        result: list[float] = []
        for i, (x, value) in enumerate(zip(xs, values.tolist(), strict=True)):
            if i in forced:
                raise FunctionEvaluationError(float(x), forced[i])
            if value.imag != 0 or not math.isfinite(value.real):
                raise FunctionEvaluationError(float(x), self._reason(value))
            result.append(value.real)
        return result

    def sample(self, xs: Sequence[float]) -> list[float | None]:
        values, forced = self._raw(xs)
        return [
            None if (i in forced or v.imag != 0 or not math.isfinite(v.real)) else v.real
            for i, v in enumerate(values.tolist())
        ]


class NumpyEvaluator(NumericEvaluator):
    def compile(self, expression: ParsedExpression) -> CompiledFunction:
        return _LambdifiedFunction(expression.payload, expression.variable)
