from __future__ import annotations

import math

import pytest

from src.domain.exceptions import InvalidBoundsError, InvalidPanelsError, UnknownVariantError
from src.domain.interpolation import lagrange_value, sample_panel_polynomial
from src.domain.value_objects.integration_bounds import IntegrationBounds
from src.domain.value_objects.integration_config import IntegrationConfig, Variant


@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf])
def test_bounds_must_be_finite(bad: float) -> None:
    with pytest.raises(InvalidBoundsError):
        IntegrationBounds(0.0, bad)


def test_bounds_allow_inverted_and_equal() -> None:
    assert IntegrationBounds(1, 0).low == 0
    assert IntegrationBounds(1, 0).high == 1
    assert IntegrationBounds(2, 2).is_degenerate


def test_config_simple_defaults_to_one_panel() -> None:
    assert IntegrationConfig.create("m", "simple", None) == IntegrationConfig("m", Variant.SIMPLE, 1)
    assert IntegrationConfig.create("m", "simple", 1).panel_count == 1


@pytest.mark.parametrize("panels", [0, 2, 5, -1])
def test_config_simple_rejects_other_panel_counts(panels: int) -> None:
    with pytest.raises(InvalidPanelsError):
        IntegrationConfig.create("m", "simple", panels)


@pytest.mark.parametrize("panels", [None, 0, 1, -3, 10_001])
def test_config_composite_rejects_out_of_range(panels: int | None) -> None:
    with pytest.raises(InvalidPanelsError):
        IntegrationConfig.create("m", "composite", panels)


@pytest.mark.parametrize("panels", [2, 10, 10_000])
def test_config_composite_accepts_range(panels: int) -> None:
    assert IntegrationConfig.create("m", "composite", panels).panel_count == panels


def test_config_unknown_variant() -> None:
    with pytest.raises(UnknownVariantError):
        IntegrationConfig.create("m", "triple", 2)


def test_lagrange_reproduces_polynomials_and_nodes() -> None:
    nodes = [0.0, 1.0, 2.0, 3.0]
    cubic = lambda t: 2 * t**3 - t**2 + 4 * t - 7  # noqa: E731
    values = [cubic(t) for t in nodes]
    for t in (0.0, 0.3, 1.0, 2.7, 3.0, -1.0):
        assert lagrange_value(nodes, values, t) == pytest.approx(cubic(t), abs=1e-10)


def test_lagrange_single_node_is_constant() -> None:
    assert lagrange_value([1.0], [4.2], 123.0) == 4.2


def test_sample_panel_polynomial_covers_panel() -> None:
    xs, ys = sample_panel_polynomial([0.0, 1.0, 2.0], [0.0, 1.0, 4.0], 10.0, 12.0, 1.0, 5)
    assert xs[0] == 10.0 and xs[-1] == 12.0 and len(xs) == len(ys) == 5
    assert ys[0] == pytest.approx(0.0) and ys[-1] == pytest.approx(4.0)
    assert ys[2] == pytest.approx(1.0)  # parabola t^2 at t=1
