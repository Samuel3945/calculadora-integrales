from __future__ import annotations

import math

import pytest

from src.domain.exceptions import FunctionEvaluationError
from src.infrastructure.numerical.numpy_evaluator import NumpyEvaluator
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser


def compile_(parser: SympyExpressionParser, evaluator: NumpyEvaluator, text: str, variable: str = "x"):  # type: ignore[no-untyped-def]
    return evaluator.compile(parser.parse(text, variable))


def test_evaluates_vectorised(parser: SympyExpressionParser, evaluator: NumpyEvaluator) -> None:
    f = compile_(parser, evaluator, "x**2 + sin(x)")
    assert f.evaluate([0.0, 1.0, 2.0]) == pytest.approx([0.0, 1 + math.sin(1), 4 + math.sin(2)])


def test_constant_expression_broadcasts(parser: SympyExpressionParser, evaluator: NumpyEvaluator) -> None:
    assert compile_(parser, evaluator, "5").evaluate([0.0, 1.0, 2.0]) == [5.0, 5.0, 5.0]
    assert compile_(parser, evaluator, "pi").evaluate([1.0]) == pytest.approx([math.pi])


def test_other_variable(parser: SympyExpressionParser, evaluator: NumpyEvaluator) -> None:
    assert compile_(parser, evaluator, "t**2", "t").evaluate([3.0]) == [9.0]


@pytest.mark.parametrize(
    ("text", "x", "reason"),
    [
        ("1/x", 0.0, "division_by_zero"),
        ("1/sqrt(x)", 0.0, "division_by_zero"),
        ("tan(x)", math.pi / 2, None),  # huge but finite in floating point: no error expected
        ("sqrt(x)", -1.0, "domain"),
        ("log(x)", -1.0, "domain"),
        ("log(x)", 0.0, "domain"),
        ("asin(x)", 2.0, "domain"),
        ("x**0.5", -4.0, "domain"),
        ("(x)**(1/3)", -8.0, "domain"),
        ("exp(x)", 1000.0, "infinite"),
        ("sin(x)/x", 0.0, "nan"),
    ],
)
def test_strict_evaluation_errors(parser: SympyExpressionParser, evaluator: NumpyEvaluator, text: str, x: float, reason: str | None) -> None:
    f = compile_(parser, evaluator, text)
    if reason is None:
        assert math.isfinite(f.evaluate([x])[0])
        return
    with pytest.raises(FunctionEvaluationError) as info:
        f.evaluate([1.0, x])
    assert info.value.x == x
    assert info.value.reason == reason
    assert info.value.details == {"x": x, "reason": reason}


def test_sampling_maps_bad_points_to_none(parser: SympyExpressionParser, evaluator: NumpyEvaluator) -> None:
    f = compile_(parser, evaluator, "1/sqrt(x)")
    assert f.sample([-1.0, 0.0, 4.0]) == [None, None, 0.5]
    g = compile_(parser, evaluator, "log(x)")
    assert g.sample([-1.0, 1.0]) == [None, 0.0]


def test_no_warnings_leak(parser: SympyExpressionParser, evaluator: NumpyEvaluator, recwarn: pytest.WarningsRecorder) -> None:
    compile_(parser, evaluator, "1/x").sample([0.0])
    compile_(parser, evaluator, "sqrt(x)").sample([-1.0])
    assert not [w for w in recwarn if issubclass(w.category, RuntimeWarning)]
