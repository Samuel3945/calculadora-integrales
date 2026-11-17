"""Pure-Python Lagrange interpolation, used to draw each panel's interpolating polynomial."""

from __future__ import annotations

from collections.abc import Sequence


def lagrange_value(nodes: Sequence[float], values: Sequence[float], t: float) -> float:
    """Evaluate at ``t`` the polynomial of minimal degree through ``(nodes[i], values[i])``."""
    if len(nodes) != len(values) or not nodes:
        raise ValueError("nodes and values must be non-empty and of equal length")
    total = 0.0
    for i, (ti, yi) in enumerate(zip(nodes, values, strict=True)):
        basis = 1.0
        for j, tj in enumerate(nodes):
            if i != j:
                basis *= (t - tj) / (ti - tj)
        total += yi * basis
    return total


def sample_panel_polynomial(
    nodes_t: Sequence[float],
    values: Sequence[float],
    start: float,
    end: float,
    h: float,
    samples: int,
) -> tuple[list[float], list[float]]:
    """Sample the panel polynomial on ``samples`` points covering ``[start, end]``.

    ``nodes_t`` are node positions in units of ``h`` from ``start`` (the polynomial is built in
    that normalised coordinate for numerical conditioning).
    """
    if samples < 2:
        raise ValueError("samples must be >= 2")
    xs: list[float] = []
    ys: list[float] = []
    for i in range(samples):
        x = end if i == samples - 1 else start + i * (end - start) / (samples - 1)
        xs.append(x)
        ys.append(lagrange_value(nodes_t, values, (x - start) / h))
    return xs, ys
