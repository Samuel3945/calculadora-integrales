from __future__ import annotations

import pytest

from src.domain.exceptions import (
    ExpressionTooComplexError,
    InvalidExpressionError,
    InvalidVariableError,
)
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser


@pytest.mark.parametrize(
    ("text", "canonical"),
    [
        ("sin(x)", "sin(x)"),
        ("x**2", "x**2"),
        ("x^2", "x**2"),
        ("x^2*3", "3*x**2"),  # '^' must bind tighter than '*' (unlike Python's xor)
        ("-x**2", "-x**2"),
        ("2^-1*x", "x/2"),
        ("sqrt(x)", "sqrt(x)"),
        ("abs(x)", "abs(x)"),
        ("log(x)", "log(x)"),
        ("exp(x)", "exp(x)"),
        ("E**x", "exp(x)"),
        ("pi*x**2", "pi*x**2"),
        ("0.5*x", "x/2"),
        ("1e-3", "1/1000"),
        ("(x**2+1)/sqrt(x)", "(x**2 + 1)/sqrt(x)"),
    ],
)
def test_canonical_forms(parser: SympyExpressionParser, text: str, canonical: str) -> None:
    parsed = parser.parse(text, "x")
    assert parsed.canonical == canonical
    assert parsed.latex
    # the canonical form is itself valid input and a fixed point
    assert parser.parse(parsed.canonical, "x").canonical == canonical


@pytest.mark.parametrize("name", ["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "sqrt", "exp", "log", "abs"])
def test_every_whitelisted_function_parses(parser: SympyExpressionParser, name: str) -> None:
    assert parser.parse(f"{name}(x)", "x").canonical == f"{name}(x)"


def test_latex_of_known_expression(parser: SympyExpressionParser) -> None:
    assert parser.parse("sin(x)", "x").latex == r"\sin{\left(x \right)}"


def test_other_variable_letters(parser: SympyExpressionParser) -> None:
    assert parser.parse("sin(t)+t", "t").canonical == "t + sin(t)"
    with pytest.raises(InvalidExpressionError):
        parser.parse("sin(x)", "t")  # x is an unknown name when the variable is t


@pytest.mark.parametrize("variable", ["e", "E", "", "xx", "1", "é", "_", " ", None, 3])
def test_invalid_variables(parser: SympyExpressionParser, variable: object) -> None:
    with pytest.raises(InvalidVariableError):
        parser.parse("1", variable)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "text", ["", "   ", "x +", "2x", "sin(x", "x y", "1 if x else 2", "x == 1", "x and 1", "x % 2", "x // 2", "~x", "not x", "x if", "5 +* 3"]
)
def test_invalid_syntax_or_operators(parser: SympyExpressionParser, text: str) -> None:
    with pytest.raises(InvalidExpressionError):
        parser.parse(text, "x")


@pytest.mark.parametrize(
    "text", ["foo(x)", "sin(x, x)", "sin()", "sin(x=1)", "sin(*x)", "y", "e", "True", "'a'", "None", "1j", "x**1j", "1/0", "log(0)", "sqrt(-1)"]
)
def test_invalid_names_arity_and_values(parser: SympyExpressionParser, text: str) -> None:
    with pytest.raises(InvalidExpressionError):
        parser.parse(text, "x")


def test_exponent_limits(parser: SympyExpressionParser) -> None:
    assert parser.parse("x**100", "x").canonical == "x**100"
    assert parser.parse("x**-100", "x")
    for text in ("x**101", "x**-101", "x**1000000"):
        with pytest.raises(ExpressionTooComplexError):
            parser.parse(text, "x")


def test_variable_exponents_are_allowed(parser: SympyExpressionParser) -> None:
    assert parser.parse("x**x", "x").canonical == "x**x"
    assert parser.parse("2**x", "x").canonical == "2**x"


def test_node_limit(parser: SympyExpressionParser) -> None:
    ok = "+".join(["x"] * 60)  # 119 expression nodes
    assert parser.parse(ok, "x")
    too_big = "+".join(["x*x"] * 60)  # 239 nodes, 239 characters
    assert len(too_big) < 256
    with pytest.raises(ExpressionTooComplexError):
        parser.parse(too_big, "x")


def test_depth_limit(parser: SympyExpressionParser) -> None:
    assert parser.parse("sin(" * 20 + "x" + ")" * 20, "x")
    with pytest.raises(ExpressionTooComplexError):
        parser.parse("sin(" * 40 + "x" + ")" * 40, "x")


def test_length_limit(parser: SympyExpressionParser) -> None:
    assert parser.parse("x" + "+0" * 90, "x")  # 181 characters, flat chain of 91 terms
    with pytest.raises(ExpressionTooComplexError):
        parser.parse("x+" * 200 + "x", "x")


@pytest.mark.parametrize(
    ("value", "expected"),
    [(0, 0.0), (1.5, 1.5), ("pi", 3.141592653589793), ("pi/2", 1.5707963267948966), ("-1/3", -1 / 3), ("E", 2.718281828459045), ("2**10", 1024.0), ("sqrt(2)", 2**0.5), ("0.1", 0.1)],
)
def test_parse_constant(parser: SympyExpressionParser, value: object, expected: float) -> None:
    assert parser.parse_constant(value).value == pytest.approx(expected, rel=1e-15)  # type: ignore[arg-type]


def test_parse_constant_latex(parser: SympyExpressionParser) -> None:
    assert parser.parse_constant("pi").latex == r"\pi"
    assert parser.parse_constant(0).latex == "0"


@pytest.mark.parametrize("value", ["x", "inf", "sqrt(-1)", "1/0", "", "foo", float("nan"), float("inf"), True, [1], "log(0)", "9**9**9"])
def test_parse_constant_rejects(parser: SympyExpressionParser, value: object) -> None:
    with pytest.raises((InvalidExpressionError, ExpressionTooComplexError)):
        parser.parse_constant(value)  # type: ignore[arg-type]
