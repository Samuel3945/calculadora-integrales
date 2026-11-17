from __future__ import annotations

import math

import pytest

from src.application.dto import CalculateIntegralCommand, CompareMethodsCommand, SolveOptions
from src.application.factories.strategy_factory import StrategyFactory
from src.application.ports.symbolic_integrator import ExactResult, ExactStatus
from src.application.use_cases.calculate_integral import CalculateIntegralUseCase
from src.application.use_cases.compare_methods import CompareMethodsUseCase
from src.application.use_cases.validate_expression import ValidateExpressionUseCase
from src.domain.exceptions import (
    FunctionEvaluationError,
    InvalidBoundsError,
    InvalidPanelsError,
    UnknownMethodError,
    UnknownVariantError,
)
from src.infrastructure.numerical.numpy_evaluator import NumpyEvaluator
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser
from tests.conftest import FakeSymbolic

NO_EXTRAS = SolveOptions(calculate_exact=False, generate_graph=False, estimate_error=False)


def make(parser: SympyExpressionParser, evaluator: NumpyEvaluator, factory: StrategyFactory, symbolic: FakeSymbolic | None = None) -> CalculateIntegralUseCase:
    return CalculateIntegralUseCase(parser, evaluator, symbolic or FakeSymbolic(), factory)


def cmd(**overrides) -> CalculateIntegralCommand:  # type: ignore[no-untyped-def]
    base = dict(
        expression="sin(x)", variable="x", lower_bound=0, upper_bound="pi",
        method="closed_simpson_13", variant="composite", panel_count=2, options=NO_EXTRAS,
    )
    base.update(overrides)
    return CalculateIntegralCommand(**base)  # type: ignore[arg-type]


def test_known_value_end_to_end(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    out = make(parser, evaluator, factory).execute(cmd())
    assert out.approximation == pytest.approx(2.0045597549844207, abs=1e-12)
    assert (out.function_evaluations, len(out.evaluations), out.panel_count, out.subinterval_count) == (5, 6, 2, 4)
    assert out.bounds.upper_latex == r"\pi" and out.bounds.lower == 0.0
    assert out.exact.status is ExactStatus.DISABLED and out.absolute_error is None
    assert out.estimated_error is None and out.graph is None and out.warnings == []


def test_numeric_result_is_independent_of_the_symbolic_engine(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    options = SolveOptions(calculate_exact=True, generate_graph=False, estimate_error=False)
    outcomes = [
        FakeSymbolic(ExactResult(ExactStatus.COMPUTED, 2.0, "2")),
        FakeSymbolic(ExactResult(ExactStatus.UNAVAILABLE)),
        FakeSymbolic(ExactResult(ExactStatus.TIMEOUT)),
    ]
    values = [make(parser, evaluator, factory, s).execute(cmd(options=options)) for s in outcomes]
    assert len({v.approximation for v in values}) == 1
    assert values[0].absolute_error == pytest.approx(abs(2.0 - values[0].approximation))
    assert values[0].relative_error == pytest.approx(values[0].absolute_error / 2.0)
    assert [w.code for w in values[1].warnings] == ["EXACT_UNAVAILABLE"]
    assert [w.code for w in values[2].warnings] == ["EXACT_TIMEOUT"]
    assert values[1].absolute_error is None and values[1].relative_error is None


def test_relative_error_is_none_when_exact_is_zero(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    symbolic = FakeSymbolic(ExactResult(ExactStatus.COMPUTED, 0.0, "0"))
    out = make(parser, evaluator, factory, symbolic).execute(
        cmd(expression="x", lower_bound=-1, upper_bound=1, options=SolveOptions(generate_graph=False, estimate_error=False))
    )
    assert out.absolute_error == pytest.approx(0.0, abs=1e-15)
    assert out.relative_error is None


def test_singularity_warning_does_not_block(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    symbolic = FakeSymbolic(points=(0.0,))
    out = make(parser, evaluator, factory, symbolic).execute(cmd(expression="1/sqrt(x)", method="open_midpoint", upper_bound=1))
    assert out.warnings[0].code == "POSSIBLE_SINGULARITY"
    assert out.warnings[0].details == {"points": [0.0]}


def test_richardson_estimate_formula(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    options = SolveOptions(calculate_exact=False, generate_graph=False, estimate_error=True)
    out = make(parser, evaluator, factory).execute(cmd(options=options))
    s = factory.get("closed_simpson_13")
    from tests.helpers.strategies import approx

    i_r, i_2r = approx(s, math.sin, 0, math.pi, 2), approx(s, math.sin, 0, math.pi, 4)
    est = out.estimated_error
    assert est is not None and est.method == "richardson" and est.refined_panel_count == 4
    assert est.refined_approximation == pytest.approx(i_2r)
    assert est.value == pytest.approx((i_2r - i_r) * 16 / 15)
    # the estimate approximates (exact - I_r) to within a small fraction of the error itself
    assert est.value == pytest.approx(2.0 - i_r, rel=0.05)


def test_richardson_on_simple_variant_uses_two_panels(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    options = SolveOptions(calculate_exact=False, generate_graph=False, estimate_error=True)
    out = make(parser, evaluator, factory).execute(cmd(variant="simple", panel_count=None, options=options))
    assert out.estimated_error is not None and out.estimated_error.refined_panel_count == 2


def test_estimate_unavailable_when_refinement_exceeds_panel_limit(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    options = SolveOptions(calculate_exact=False, generate_graph=False, estimate_error=True)
    out = make(parser, evaluator, factory).execute(cmd(method="open_midpoint", panel_count=6000, options=options))
    assert out.estimated_error is None
    assert [w.code for w in out.warnings] == ["ESTIMATE_UNAVAILABLE"]
    assert out.approximation == pytest.approx(2.0, abs=1e-5)


def test_equal_bounds(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    out = make(parser, evaluator, factory).execute(cmd(lower_bound=1, upper_bound="1", options=SolveOptions()))
    assert out.approximation == 0.0 and out.evaluations == () and out.panels == ()
    assert [w.code for w in out.warnings] == ["EQUAL_BOUNDS"]
    assert out.exact.value == 0.0 and out.estimated_error is None
    assert out.graph is not None and out.graph.nodes.x == []


def test_inverted_bounds_keep_sign(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    uc = make(parser, evaluator, factory)
    forward = uc.execute(cmd(lower_bound=0, upper_bound=1, expression="x**2"))
    backward = uc.execute(cmd(lower_bound=1, upper_bound=0, expression="x**2"))
    assert backward.approximation == pytest.approx(-forward.approximation)
    assert backward.panel_width < 0


def test_graph_content(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    out = make(parser, evaluator, factory).execute(cmd(options=SolveOptions(calculate_exact=False, graph_points=60, estimate_error=False)))
    g = out.graph
    assert g is not None
    assert len(g.curve.x) == len(g.curve.y) == 60
    assert g.curve.x[0] == pytest.approx(-0.1 * math.pi) and g.curve.x[-1] == pytest.approx(1.1 * math.pi)
    assert g.area.x[0] == 0.0 and g.area.x[-1] == pytest.approx(math.pi)
    assert len(g.nodes.x) == 5
    assert [c.panel for c in g.approximation_curves] == [1, 2]
    # each interpolating polynomial passes through the panel's nodes
    first = g.approximation_curves[0]
    assert first.x[0] == 0.0 and first.x[-1] == pytest.approx(math.pi / 2)
    assert first.y[0] == pytest.approx(0.0, abs=1e-12) and first.y[-1] == pytest.approx(1.0)


def test_midpoint_approximation_curve_is_constant(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    out = make(parser, evaluator, factory).execute(cmd(method="open_midpoint", options=SolveOptions(calculate_exact=False, estimate_error=False)))
    assert out.graph is not None
    for curve in out.graph.approximation_curves:
        assert len(set(curve.y)) == 1


def test_graph_marks_undefined_points_as_none(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    out = make(parser, evaluator, factory).execute(cmd(expression="sqrt(x)", method="open_midpoint", lower_bound=0, upper_bound=1, options=SolveOptions(calculate_exact=False, estimate_error=False)))
    assert out.graph is not None
    assert out.graph.curve.y[0] is None  # x < 0
    assert out.graph.curve.y[-1] is not None


@pytest.mark.parametrize(
    ("overrides", "error"),
    [
        (dict(method="nope"), UnknownMethodError),
        (dict(variant="triple"), UnknownVariantError),
        (dict(variant="simple", panel_count=3), InvalidPanelsError),
        (dict(variant="composite", panel_count=1), InvalidPanelsError),
        (dict(variant="composite", panel_count=None), InvalidPanelsError),
        (dict(variant="composite", panel_count=10001), InvalidPanelsError),
        (dict(upper_bound="inf"), InvalidBoundsError),
        (dict(lower_bound="x"), InvalidBoundsError),
        (dict(upper_bound=float("nan")), InvalidBoundsError),
    ],
)
def test_validation_errors(parser, evaluator, factory, overrides, error) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(error):
        make(parser, evaluator, factory).execute(cmd(**overrides))


@pytest.mark.parametrize("expression", ["1/x", "log(x)", "sqrt(x)", "1/(x-0.5)"])
def test_function_evaluation_failure_returns_no_approximation(parser, evaluator, factory, expression) -> None:  # type: ignore[no-untyped-def]
    lower = -1 if expression == "sqrt(x)" else 0
    with pytest.raises(FunctionEvaluationError):
        make(parser, evaluator, factory).execute(cmd(expression=expression, method="closed_trapezoid", lower_bound=lower, upper_bound=1))


def test_compare_with_partial_failure(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    symbolic = FakeSymbolic(ExactResult(ExactStatus.COMPUTED, 2.0, "2"), points=(0.0,))
    uc = CompareMethodsUseCase(parser, evaluator, symbolic, factory)
    out = uc.execute(CompareMethodsCommand("1/sqrt(x)", "x", 0, 1, "composite", 4))
    by_id = {r.method.id: r for r in out.results}
    assert list(by_id) == factory.ids()
    for sid in ("closed_trapezoid", "closed_simpson_13", "closed_simpson_38", "closed_boole"):
        row = by_id[sid]
        assert row.status == "error" and row.approximation is None and row.function_evaluations is None
        assert row.error is not None and row.error.code == "FUNCTION_EVALUATION_ERROR"
    for sid in ("open_midpoint", "open_newton_cotes_2", "open_newton_cotes_3", "open_newton_cotes_4"):
        row = by_id[sid]
        assert row.status == "ok" and row.error is None and row.approximation is not None
        assert row.absolute_error == pytest.approx(abs(2.0 - row.approximation))
    assert symbolic.calls == 1  # the symbolic engine runs once for the whole comparison
    assert [w.code for w in out.warnings] == ["POSSIBLE_SINGULARITY"]


def test_compare_subset_dedup_and_unknown(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    uc = CompareMethodsUseCase(parser, evaluator, FakeSymbolic(), factory)
    out = uc.execute(CompareMethodsCommand("x", "x", 0, 1, "simple", None, ("open_midpoint", "closed_trapezoid", "open_midpoint")))
    assert [r.method.id for r in out.results] == ["open_midpoint", "closed_trapezoid"]
    assert out.panel_count == 1
    with pytest.raises(UnknownMethodError):
        uc.execute(CompareMethodsCommand("x", "x", 0, 1, "simple", None, ("nope",)))


def test_compare_equal_bounds(parser, evaluator, factory) -> None:  # type: ignore[no-untyped-def]
    uc = CompareMethodsUseCase(parser, evaluator, FakeSymbolic(), factory)
    out = uc.execute(CompareMethodsCommand("x", "x", 2, 2, "composite", 3))
    assert [w.code for w in out.warnings] == ["EQUAL_BOUNDS"]
    assert all(r.status == "ok" and r.approximation == 0.0 for r in out.results)


def test_validate_expression(parser) -> None:  # type: ignore[no-untyped-def]
    uc = ValidateExpressionUseCase(parser)
    ok = uc.execute("x^2")
    assert ok.valid and ok.canonical == "x**2" and ok.error is None
    bad = uc.execute("__import__('os')")
    assert not bad.valid and bad.canonical is None and bad.error is not None
    assert bad.error.code == "INVALID_EXPRESSION"
    assert uc.execute("x", "e").error.code == "INVALID_VARIABLE"  # type: ignore[union-attr]
