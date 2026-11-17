"""Real SymPy adapter, run in its separate process."""

from __future__ import annotations

import time

import pytest

from src.application.ports.symbolic_integrator import ExactStatus
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser
from src.infrastructure.symbolic.sympy_integrator import SympyIntegrator
from tests.helpers.slow_worker import sleeping_worker


@pytest.fixture(scope="module")
def integrator() -> SympyIntegrator:
    return SympyIntegrator(timeout_seconds=10)


def analyze(integrator: SympyIntegrator, parser: SympyExpressionParser, text: str, a, b, exact: bool = True):  # type: ignore[no-untyped-def]
    return integrator.analyze(parser.parse(text, "x"), parser.parse_constant(a), parser.parse_constant(b), exact)


def test_exact_value(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    result = analyze(integrator, parser, "sin(x)", 0, "pi")
    assert result.exact.status is ExactStatus.COMPUTED
    assert result.exact.value == pytest.approx(2.0)
    assert result.exact.latex == "2"
    assert result.singular_points == ()


def test_exact_with_symbolic_closed_form(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    result = analyze(integrator, parser, "exp(x)", 0, 1)
    assert result.exact.value == pytest.approx(2.718281828459045 - 1)
    assert "e" in (result.exact.latex or "")


def test_inverted_bounds_give_negative_exact(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    assert analyze(integrator, parser, "x", 1, 0).exact.value == pytest.approx(-0.5)


def test_disabled_skips_exact_but_reports_singularities(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    result = analyze(integrator, parser, "1/x", 0, 1, exact=False)
    assert result.exact.status is ExactStatus.DISABLED and result.exact.value is None
    assert result.singular_points == (0.0,)


def test_unavailable_for_divergent_or_complex_results(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    divergent = analyze(integrator, parser, "1/x", -1, 1)
    assert divergent.exact.status is ExactStatus.UNAVAILABLE
    assert divergent.singular_points == (0.0,)
    assert analyze(integrator, parser, "sqrt(x)", -1, 1).exact.status is ExactStatus.UNAVAILABLE


def test_improper_but_convergent_integral_still_warns(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    result = analyze(integrator, parser, "1/sqrt(x)", 0, 1)
    assert result.exact.value == pytest.approx(2.0)
    assert result.singular_points == (0.0,)


def test_singularity_inside_the_interval(integrator, parser) -> None:  # type: ignore[no-untyped-def]
    result = analyze(integrator, parser, "tan(x)", 0, 2)
    assert result.singular_points == pytest.approx((1.5707963267948966,))


def test_timeout_kills_the_child_and_reports_timeout(parser) -> None:  # type: ignore[no-untyped-def]
    integrator = SympyIntegrator(timeout_seconds=0.5, worker=sleeping_worker)
    start = time.monotonic()
    result = analyze(integrator, parser, "x", 0, 1)
    elapsed = time.monotonic() - start
    assert result.exact.status is ExactStatus.TIMEOUT
    assert result.singular_points == (0.5,)  # partial result streamed before the hang is kept
    assert elapsed < 5  # killed at ~0.5s, not after the worker's 60s sleep


def test_timeout_with_real_hard_integral(parser) -> None:  # type: ignore[no-untyped-def]
    integrator = SympyIntegrator(timeout_seconds=0.3)
    result = analyze(integrator, parser, "exp(sin(x**3))*cos(x)**x", 0, 3)
    assert result.exact.status in (ExactStatus.TIMEOUT, ExactStatus.UNAVAILABLE)
    assert result.exact.value is None
