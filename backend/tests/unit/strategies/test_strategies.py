"""Mathematical verification of the eight rules x two variants (16 variants in total)."""

from __future__ import annotations

import math
from collections.abc import Sequence

import pytest

from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.exceptions import FunctionEvaluationError
from src.domain.interfaces.integration_strategy import Family, IntegrationStrategy
from src.domain.value_objects.integration_bounds import IntegrationBounds
from tests.helpers.strategies import ALL_STRATEGIES, BY_ID, E_MINUS_1, approx, problem

# Tolerance for "exact" results. Weights are exact fractions rounded once to float (relative
# error ~1.1e-16) and every sum has at most ~50 terms of magnitude <= ~1 on [0, 1], so the
# accumulated rounding error is a few 1e-16; 1e-12 leaves four orders of margin while a truly
# non-exact rule on degree+1 polynomials misses by >= 1e-6 (checked below).
EXACT_TOL = 1e-12

# (id, family, degree, subintervals per panel, nodes per panel, composite error order)
CONTRACT_TABLE = [
    ("closed_trapezoid", "closed", 1, 1, 2, 2),
    ("closed_simpson_13", "closed", 3, 2, 3, 4),
    ("closed_simpson_38", "closed", 3, 3, 4, 4),
    ("closed_boole", "closed", 5, 4, 5, 6),
    ("open_midpoint", "open", 1, 2, 1, 2),
    ("open_newton_cotes_2", "open", 1, 3, 2, 2),
    ("open_newton_cotes_3", "open", 3, 4, 3, 4),
    ("open_newton_cotes_4", "open", 3, 5, 4, 4),
]
VARIANTS = [("simple", 1), ("composite", 3)]

strategies = pytest.mark.parametrize("strategy", ALL_STRATEGIES, ids=lambda s: s.id)
variants = pytest.mark.parametrize(("variant", "panels"), VARIANTS, ids=[v[0] for v in VARIANTS])


@pytest.mark.parametrize(("sid", "family", "degree", "n", "nodes", "order"), CONTRACT_TABLE)
def test_metadata_matches_contract(sid: str, family: str, degree: int, n: int, nodes: int, order: int) -> None:
    s = BY_ID[sid]
    assert (s.family, s.degree_of_exactness, s.subintervals_per_panel) == (family, degree, n)
    assert (s.nodes_per_panel, s.error_order) == (nodes, order)
    assert s.error_order == s.degree_of_exactness + 1


def test_eight_unique_strategies() -> None:
    assert len({s.id for s in ALL_STRATEGIES}) == 8


@strategies
def test_node_distribution(strategy: IntegrationStrategy) -> None:
    n = strategy.subintervals_per_panel
    expected = tuple(range(n + 1)) if strategy.family is Family.CLOSED else tuple(range(1, n))
    assert strategy.local_nodes == expected
    assert len(strategy.local_weights) == len(strategy.local_nodes)


def test_midpoint_definition() -> None:
    s = BY_ID["open_midpoint"]
    assert (s.subintervals_per_panel, s.local_nodes, s.local_weights) == (2, (1,), (2.0,))


@strategies
def test_weights_sum_to_panel_width(strategy: IntegrationStrategy) -> None:
    # In units of h the weights must add up to the number of subintervals, i.e. sum * h == W.
    assert math.fsum(strategy.local_weights) == pytest.approx(strategy.subintervals_per_panel, abs=1e-14)


def test_published_weights() -> None:
    assert BY_ID["closed_simpson_13"].local_weights == pytest.approx((1 / 3, 4 / 3, 1 / 3), abs=1e-15)
    assert BY_ID["closed_simpson_38"].local_weights == pytest.approx((3 / 8, 9 / 8, 9 / 8, 3 / 8), abs=1e-15)
    assert BY_ID["closed_boole"].local_weights == pytest.approx(
        tuple(c * 2 / 45 for c in (7, 32, 12, 32, 7)), abs=1e-15
    )
    assert BY_ID["open_newton_cotes_3"].local_weights == pytest.approx((8 / 3, -4 / 3, 8 / 3), abs=1e-15)
    assert BY_ID["open_newton_cotes_4"].local_weights == pytest.approx(
        tuple(c * 5 / 24 for c in (11, 1, 1, 11)), abs=1e-15
    )


# -- exactness ---------------------------------------------------------------------------------
@strategies
@variants
def test_exact_for_polynomials_up_to_degree(strategy: IntegrationStrategy, variant: str, panels: int) -> None:
    for k in range(strategy.degree_of_exactness + 1):
        result = approx(strategy, lambda x, k=k: x**k, 0.0, 1.0, panels)
        assert result == pytest.approx(1 / (k + 1), abs=EXACT_TOL), (variant, k)


@strategies
@variants
def test_not_exact_one_degree_above(strategy: IntegrationStrategy, variant: str, panels: int) -> None:
    k = strategy.degree_of_exactness + 1
    # composite uses 2 panels here so that the missed amount stays well above rounding noise
    r = 1 if variant == "simple" else 2
    result = approx(strategy, lambda x: x**k, 0.0, 1.0, r)
    assert abs(result - 1 / (k + 1)) > 1e-7


# -- reference integrals -----------------------------------------------------------------------
REFERENCES = [
    ("x", lambda x: x, 0.0, 1.0, 1 / 2),
    ("x^2", lambda x: x**2, 0.0, 1.0, 1 / 3),
    ("x^3", lambda x: x**3, 0.0, 1.0, 1 / 4),
    ("x^4", lambda x: x**4, 0.0, 1.0, 1 / 5),
    ("exp(x)", math.exp, 0.0, 1.0, E_MINUS_1),
    ("sin(x)", math.sin, 0.0, math.pi, 2.0),
]


@strategies
@pytest.mark.parametrize(("name", "f", "a", "b", "exact"), REFERENCES, ids=[r[0] for r in REFERENCES])
def test_composite_converges_to_reference_integrals(
    strategy: IntegrationStrategy, name: str, f, a: float, b: float, exact: float  # type: ignore[no-untyped-def]
) -> None:
    # With r = 200 panels the truncation error is ~C * (b-a) * h^p. For p = 2 rules C*h^2 is
    # below ~1e-4 here (largest constant: open_newton_cotes_2 on sin), so 5e-4 is safe; higher
    # order rules are far smaller and use 1e-7.
    tol = 5e-4 if strategy.error_order == 2 else 1e-7
    assert approx(strategy, f, a, b, 200) == pytest.approx(exact, abs=tol)


@strategies
@pytest.mark.parametrize(("name", "f", "a", "b", "exact"), REFERENCES[:4], ids=[r[0] for r in REFERENCES[:4]])
def test_simple_variant_on_reference_polynomials(
    strategy: IntegrationStrategy, name: str, f, a: float, b: float, exact: float  # type: ignore[no-untyped-def]
) -> None:
    power = int(name[-1]) if name[-1].isdigit() else 1
    if power <= strategy.degree_of_exactness:
        assert approx(strategy, f, a, b, 1) == pytest.approx(exact, abs=EXACT_TOL)
    else:
        assert abs(approx(strategy, f, a, b, 1) - exact) > 1e-7


def test_simple_formulas_match_the_specification() -> None:
    """Hand-coded textbook formulas (spec section 6), independent of the weight tables."""
    f = math.exp
    a, b = 0.3, 1.7
    w = b - a
    expected = {
        "closed_trapezoid": (w / 2) * (f(a) + f(b)),
        "closed_simpson_13": (w / 2 / 3) * (f(a) + 4 * f(a + w / 2) + f(b)),
        "closed_simpson_38": (3 * (w / 3) / 8) * (f(a) + 3 * f(a + w / 3) + 3 * f(a + 2 * w / 3) + f(b)),
        "closed_boole": (2 * (w / 4) / 45)
        * (7 * f(a) + 32 * f(a + w / 4) + 12 * f(a + w / 2) + 32 * f(a + 3 * w / 4) + 7 * f(b)),
        "open_midpoint": w * f((a + b) / 2),
        "open_newton_cotes_2": (3 * (w / 3) / 2) * (f(a + w / 3) + f(a + 2 * w / 3)),
        "open_newton_cotes_3": (4 * (w / 4) / 3) * (2 * f(a + w / 4) - f(a + w / 2) + 2 * f(a + 3 * w / 4)),
        "open_newton_cotes_4": (5 * (w / 5) / 24)
        * (11 * f(a + w / 5) + f(a + 2 * w / 5) + f(a + 3 * w / 5) + 11 * f(a + 4 * w / 5)),
    }
    for sid, value in expected.items():
        assert approx(BY_ID[sid], f, a, b, 1) == pytest.approx(value, rel=1e-13), sid


def test_known_value_simpson_13_composite_two_panels() -> None:
    result = BY_ID["closed_simpson_13"].integrate(problem(math.sin, 0.0, math.pi), 2)
    assert result.approximation == pytest.approx(2.0045597549844207, abs=1e-12)
    assert result.function_evaluations == 5
    assert len(result.evaluations) == 6
    assert result.subinterval_count == 4
    assert result.panel_width == pytest.approx(math.pi / 2)
    assert result.step == pytest.approx(math.pi / 4)


# -- structure of the procedure ----------------------------------------------------------------
GEOM = (-1.5, 2.5, 3)  # a, b, r


@strategies
def test_evaluation_rows_follow_the_geometry(strategy: IntegrationStrategy) -> None:
    a, b, r = GEOM
    result = strategy.integrate(problem(math.sin, a, b), r)
    w = (b - a) / r
    h = w / strategy.subintervals_per_panel
    rows = iter(result.evaluations)
    index = 0
    for p in range(r):
        for k, weight in zip(strategy.local_nodes, strategy.local_weights, strict=True):
            row = next(rows)
            index += 1
            assert (row.index, row.panel) == (index, p + 1)
            assert row.x == pytest.approx(a + p * w + k * h, abs=1e-13)
            assert row.fx == pytest.approx(math.sin(row.x))
            assert row.weight == pytest.approx(weight * h, abs=1e-14)
            assert row.contribution == pytest.approx(row.weight * row.fx, abs=1e-14)
    assert next(rows, None) is None


@strategies
def test_weights_of_each_panel_add_up_to_panel_width(strategy: IntegrationStrategy) -> None:
    a, b, r = GEOM
    result = strategy.integrate(problem(math.cos, a, b), r)
    per = strategy.nodes_per_panel
    for p in range(r):
        rows = result.evaluations[p * per : (p + 1) * per]
        assert math.fsum(row.weight for row in rows) == pytest.approx(result.panel_width, abs=1e-13)


@strategies
def test_panel_results_and_their_sum(strategy: IntegrationStrategy) -> None:
    a, b, r = GEOM
    f = math.exp
    result = strategy.integrate(problem(f, a, b), r)
    assert len(result.panels) == r
    for panel in result.panels:
        # Each panel equals the simple rule applied to the panel's own interval.
        single = strategy.integrate(problem(f, panel.start, panel.end), 1).approximation
        assert panel.approximation == pytest.approx(single, rel=1e-12)
        rows = [e for e in result.evaluations if e.panel == panel.index]
        assert panel.approximation == pytest.approx(math.fsum(e.contribution for e in rows), abs=1e-13)
    assert result.approximation == pytest.approx(math.fsum(p.approximation for p in result.panels), abs=1e-13)
    assert result.panels[0].start == a and result.panels[-1].end == b


@strategies
def test_function_evaluation_count(strategy: IntegrationStrategy) -> None:
    for r in (1, 2, 5):
        result = strategy.integrate(problem(math.sin, 0.0, 1.0), r)
        n, m = strategy.subintervals_per_panel, strategy.nodes_per_panel
        assert len(result.evaluations) == r * m
        expected_unique = r * n + 1 if strategy.family is Family.CLOSED else r * m
        assert result.function_evaluations == expected_unique


@strategies
def test_each_unique_node_is_evaluated_exactly_once(strategy: IntegrationStrategy) -> None:
    calls: list[list[float]] = []

    def counting(xs: Sequence[float]) -> list[float]:
        calls.append(list(xs))
        return [math.sin(x) for x in xs]

    strategy.integrate(IntegrationProblem(counting, "x", IntegrationBounds(0.0, 3.0)), 4)
    flat = [x for call in calls for x in call]
    assert len(flat) == len(set(flat))


def test_shared_nodes_are_flagged_and_identical() -> None:
    result = BY_ID["closed_simpson_13"].integrate(problem(math.sin, 0.0, math.pi), 3)
    shared = [e for e in result.evaluations if e.shared]
    assert len(shared) == 4  # two internal boundaries, two rows each
    by_x: dict[float, list[float]] = {}
    for e in shared:
        by_x.setdefault(e.x, []).append(e.fx)
    assert len(by_x) == 2 and all(len(v) == 2 and v[0] == v[1] for v in by_x.values())
    assert not any(e.shared for e in BY_ID["open_midpoint"].integrate(problem(math.sin, 0.0, 1.0), 4).evaluations)


@strategies
def test_closed_rules_hit_endpoints_and_open_rules_never_do(strategy: IntegrationStrategy) -> None:
    a, b, r = GEOM
    result = strategy.integrate(problem(math.sin, a, b), r)
    xs = {x for x, _ in result.nodes}
    boundaries = {p.start for p in result.panels} | {p.end for p in result.panels}
    if strategy.family is Family.CLOSED:
        assert a in xs and b in xs  # exactly, not approximately
        assert boundaries <= xs
    else:
        assert not (boundaries & xs)
        assert all(a < x < b for x in xs)


@strategies
@variants
def test_inverted_bounds_flip_the_sign(strategy: IntegrationStrategy, variant: str, panels: int) -> None:
    forward = approx(strategy, math.exp, 0.2, 1.4, panels)
    backward = approx(strategy, math.exp, 1.4, 0.2, panels)
    assert backward == pytest.approx(-forward, rel=1e-13)
    result = strategy.integrate(problem(math.exp, 1.4, 0.2), panels)
    assert result.panel_width < 0 and result.step < 0


# -- errors ------------------------------------------------------------------------------------
@strategies
def test_non_finite_values_raise_function_evaluation_error(strategy: IntegrationStrategy) -> None:
    # Poison the first node the rule needs (an endpoint for closed rules, interior for open ones).
    target = strategy.integrate(problem(math.sin, 0.0, 1.0), 1).nodes[0][0]
    poisoned = lambda xs: [math.nan if x == target else 1.0 for x in xs]  # noqa: E731
    with pytest.raises(FunctionEvaluationError) as info:
        strategy.integrate(IntegrationProblem(poisoned, "x", IntegrationBounds(0.0, 1.0)), 1)
    assert info.value.reason == "nan"
    assert info.value.x == target
    assert info.value.code == "FUNCTION_EVALUATION_ERROR"


def test_infinite_value_reports_infinite() -> None:
    with pytest.raises(FunctionEvaluationError) as info:
        BY_ID["closed_trapezoid"].integrate(
            IntegrationProblem(lambda xs: [math.inf for _ in xs], "x", IntegrationBounds(0.0, 1.0)), 2
        )
    assert info.value.reason == "infinite"


def test_overflowing_contribution_is_rejected() -> None:
    with pytest.raises(FunctionEvaluationError):
        BY_ID["closed_trapezoid"].integrate(problem(lambda x: 1e308, 0.0, 1e10), 1)


# -- convergence -------------------------------------------------------------------------------
@strategies
def test_composite_error_decreases_at_the_expected_order(strategy: IntegrationStrategy) -> None:
    exact = E_MINUS_1
    r = 4
    e1 = abs(approx(strategy, math.exp, 0.0, 1.0, r) - exact)
    e2 = abs(approx(strategy, math.exp, 0.0, 1.0, 2 * r) - exact)
    observed = math.log2(e1 / e2)
    assert observed == pytest.approx(strategy.error_order, abs=0.6), (observed, strategy.error_order)
