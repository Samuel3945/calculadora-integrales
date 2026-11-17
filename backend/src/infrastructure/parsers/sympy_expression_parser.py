"""Safe expression parser.

User text is parsed with ``ast.parse(mode="eval")`` and walked by a whitelist builder that
constructs the SymPy tree by hand. ``eval``, ``exec``, ``sympify`` and ``parse_expr`` are never
called on user input, so no user-controlled code can run.
"""

from __future__ import annotations

import ast
import math
from collections.abc import Callable
from typing import Any

import sympy
from sympy.printing.str import StrPrinter

from src.application.ports.expression_parser import ExpressionParser, ParsedConstant, ParsedExpression
from src.domain.exceptions import (
    ExpressionTooComplexError,
    InvalidExpressionError,
    InvalidVariableError,
)

MAX_LENGTH = 256
MAX_NODES = 200
MAX_DEPTH = 30
MAX_NUMERIC_EXPONENT = 100
MAX_CONSTANT_DIGITS = 300  # a constant power may not exceed ~10**300 in magnitude

FUNCTIONS: dict[str, Callable[[Any], Any]] = {
    "sin": sympy.sin,
    "cos": sympy.cos,
    "tan": sympy.tan,
    "asin": sympy.asin,
    "acos": sympy.acos,
    "atan": sympy.atan,
    "sinh": sympy.sinh,
    "cosh": sympy.cosh,
    "tanh": sympy.tanh,
    "sqrt": sympy.sqrt,
    "exp": sympy.exp,
    "log": sympy.log,  # natural logarithm
    "abs": sympy.Abs,
}
CONSTANTS: dict[str, Any] = {"pi": sympy.pi, "E": sympy.E}
_FORBIDDEN_VARIABLES = frozenset("eE")
_NON_FINITE = (sympy.zoo, sympy.nan, sympy.oo, -sympy.oo)


def make_symbol(name: str) -> sympy.Symbol:
    """The integration variable. Real, since the first version works with real functions only."""
    return sympy.Symbol(name, real=True)


class _CanonicalPrinter(StrPrinter):
    """Prints SymPy trees back in the canonical grammar (``abs`` instead of ``Abs``)."""

    def _print_Abs(self, expr: Any) -> str:
        return f"abs({self._print(expr.args[0])})"


_printer = _CanonicalPrinter()


def _validate_variable(variable: object) -> str:
    if (
        not isinstance(variable, str)
        or len(variable) != 1
        or not variable.isascii()
        or not variable.isalpha()
        or variable in _FORBIDDEN_VARIABLES
    ):
        raise InvalidVariableError(
            "variable must be a single ASCII letter other than 'e' or 'E'", {"variable": variable}
        )
    return variable


class _Builder:
    """Whitelist AST walker that builds the SymPy expression."""

    def __init__(self, variable: str | None) -> None:
        self._variable = variable
        self._symbol = make_symbol(variable) if variable else None
        self._handlers: dict[type, Callable[[Any], Any]] = {
            ast.Expression: lambda n: self.build(n.body),
            ast.Constant: self._constant,
            ast.Name: self._name,
            ast.BinOp: self._binop,
            ast.UnaryOp: self._unary,
            ast.Call: self._call,
        }

    def build(self, node: ast.AST) -> Any:
        handler = self._handlers.get(type(node))
        if handler is None:
            raise InvalidExpressionError(
                f"unsupported syntax: {type(node).__name__}", {"construct": type(node).__name__}
            )
        return self._check(handler(node))

    # -- node handlers -------------------------------------------------------------------
    @staticmethod
    def _constant(node: ast.Constant) -> Any:
        value = node.value
        if type(value) is int:
            return sympy.Integer(value)
        if type(value) is float:
            if not math.isfinite(value):
                raise InvalidExpressionError("numeric literal is not finite")
            return sympy.Rational(repr(value))  # exact decimal: 0.1 -> 1/10
        raise InvalidExpressionError(
            f"unsupported literal: {type(value).__name__}", {"literal": type(value).__name__}
        )

    def _name(self, node: ast.Name) -> Any:
        if self._symbol is not None and node.id == self._variable:
            return self._symbol
        if node.id in CONSTANTS:
            return CONSTANTS[node.id]
        raise InvalidExpressionError(f"unknown name {node.id!r}", {"name": node.id})

    def _binop(self, node: ast.BinOp) -> Any:
        op = type(node.op)
        left, right = self.build(node.left), self.build(node.right)
        if op is ast.Add:
            return left + right
        if op is ast.Sub:
            return left - right
        if op is ast.Mult:
            return left * right
        if op is ast.Div:
            return left / right
        if op is ast.Pow:
            return self._power(left, right)
        raise InvalidExpressionError(f"unsupported operator: {op.__name__}", {"operator": op.__name__})

    def _unary(self, node: ast.UnaryOp) -> Any:
        operand = self.build(node.operand)
        if isinstance(node.op, ast.USub):
            return -operand
        if isinstance(node.op, ast.UAdd):
            return operand
        raise InvalidExpressionError(f"unsupported operator: {type(node.op).__name__}")

    def _call(self, node: ast.Call) -> Any:
        if not isinstance(node.func, ast.Name) or node.func.id not in FUNCTIONS:
            name = node.func.id if isinstance(node.func, ast.Name) else type(node.func).__name__
            raise InvalidExpressionError(f"function not allowed: {name!r}", {"function": name})
        if node.keywords:
            raise InvalidExpressionError("keyword arguments are not allowed")
        if len(node.args) != 1 or isinstance(node.args[0], ast.Starred):
            raise InvalidExpressionError(
                f"{node.func.id}() takes exactly one argument", {"function": node.func.id}
            )
        return FUNCTIONS[node.func.id](self.build(node.args[0]))

    # -- guards --------------------------------------------------------------------------
    @staticmethod
    def _power(base: Any, exponent: Any) -> Any:
        if exponent.is_number:
            try:
                exp_value = float(sympy.N(exponent))
            except TypeError:
                raise InvalidExpressionError("exponent must be a real number") from None
            if abs(exp_value) > MAX_NUMERIC_EXPONENT:
                raise ExpressionTooComplexError(
                    f"numeric exponent exceeds {MAX_NUMERIC_EXPONENT} in absolute value",
                    {"limit": MAX_NUMERIC_EXPONENT},
                )
            if base.is_number:
                magnitude = abs(complex(sympy.N(base)))
                if magnitude > 0 and abs(exp_value) * abs(math.log10(magnitude)) > MAX_CONSTANT_DIGITS:
                    raise ExpressionTooComplexError("constant power is too large to evaluate")
        return base**exponent

    @staticmethod
    def _check(node: Any) -> Any:
        if node.has(sympy.I):
            raise InvalidExpressionError("complex values are not supported")
        if any(node.has(bad) for bad in _NON_FINITE):
            raise InvalidExpressionError("expression is undefined or infinite (e.g. division by zero)")
        return node


_ADDITIVE = (ast.Add, ast.Sub)
_MULTIPLICATIVE = (ast.Mult, ast.Div)


def _same_chain(parent: ast.AST, child: ast.AST) -> bool:
    """True when ``child`` continues a flat chain such as ``a+b-c+d`` or ``a*b/c*d``.

    Python parses those left-nested, which would make a long (but flat) sum count as deep
    nesting. Chains of the same operator family count as a single level."""
    if not (isinstance(parent, ast.BinOp) and isinstance(child, ast.BinOp)):
        return False
    return any(
        isinstance(parent.op, family) and isinstance(child.op, family)
        for family in (_ADDITIVE, _MULTIPLICATIVE)
    )


def _depth(node: ast.AST) -> int:
    best = 0
    for child in ast.iter_child_nodes(node):
        if isinstance(child, ast.expr):
            extra = _depth(child) - (1 if _same_chain(node, child) and child is getattr(node, "left", None) else 0)
            best = max(best, extra)
    return 1 + best


def _limits_ok(tree: ast.Expression) -> None:
    count = sum(1 for n in ast.walk(tree) if isinstance(n, ast.expr))
    if count > MAX_NODES:
        raise ExpressionTooComplexError(
            f"expression has {count} nodes (limit {MAX_NODES})", {"limit": MAX_NODES}
        )
    if _depth(tree.body) > MAX_DEPTH:
        raise ExpressionTooComplexError(f"expression nesting exceeds {MAX_DEPTH}", {"limit": MAX_DEPTH})


class SympyExpressionParser(ExpressionParser):
    def parse(self, text: str, variable: str) -> ParsedExpression:
        variable = _validate_variable(variable)
        expr = self._to_sympy(text, variable)
        extra = expr.free_symbols - {make_symbol(variable)}
        if extra:  # defensive: the builder cannot produce them
            raise InvalidExpressionError("unexpected symbols in expression")
        return ParsedExpression(_printer.doprint(expr), sympy.latex(expr), variable, expr)

    def parse_constant(self, value: str | int | float) -> ParsedConstant:
        if isinstance(value, bool):
            raise InvalidExpressionError("bound must be a number or a constant expression")
        if isinstance(value, (int, float)):
            if isinstance(value, float) and not math.isfinite(value):
                raise InvalidExpressionError("bound must be finite")
            expr = sympy.Rational(repr(value)) if isinstance(value, float) else sympy.Integer(value)
        elif isinstance(value, str):
            expr = self._to_sympy(value, None)
        else:
            raise InvalidExpressionError("bound must be a number or a constant expression")
        numeric = sympy.N(expr, 25)
        if numeric.is_real is not True:
            raise InvalidExpressionError("bound must evaluate to a real number")
        try:
            number = float(numeric)
        except OverflowError:
            raise InvalidExpressionError("bound is too large") from None
        if not math.isfinite(number):
            raise InvalidExpressionError("bound must be finite")
        return ParsedConstant(number, _printer.doprint(expr), sympy.latex(expr), expr)

    @staticmethod
    def _to_sympy(text: object, variable: str | None) -> Any:
        if not isinstance(text, str):
            raise InvalidExpressionError("expression must be a string")
        if len(text) > MAX_LENGTH:
            raise ExpressionTooComplexError(
                f"expression is longer than {MAX_LENGTH} characters", {"limit": MAX_LENGTH}
            )
        source = text.strip().replace("^", "**")
        if not source:
            raise InvalidExpressionError("expression is empty")
        try:
            tree = ast.parse(source, mode="eval")
        except SyntaxError as exc:
            if "too many nested" in str(exc):
                raise ExpressionTooComplexError("expression nesting is too deep") from None
            raise InvalidExpressionError(
                "expression is not valid syntax", {"position": exc.offset}
            ) from None
        except (ValueError, RecursionError, MemoryError):
            raise ExpressionTooComplexError("expression cannot be parsed safely") from None
        try:
            _limits_ok(tree)
            return _Builder(variable).build(tree)
        except RecursionError:
            raise ExpressionTooComplexError("expression nesting is too deep") from None
