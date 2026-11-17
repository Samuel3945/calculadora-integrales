"""Builds plot-ready coordinates (no images): curve, area, nodes and panel polynomials."""

from __future__ import annotations

from src.application.dto import GraphData, PanelCurve, Series
from src.application.ports.numeric_evaluator import CompiledFunction
from src.domain.entities.integration_result import IntegrationResult
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.interpolation import sample_panel_polynomial
from src.domain.value_objects.integration_bounds import IntegrationBounds

CURVE_MARGIN = 0.10
MIN_SAMPLES_PER_PANEL = 4
MAX_SAMPLES_PER_PANEL = 60


def _linspace(start: float, stop: float, count: int) -> list[float]:
    if count == 1:
        return [start]
    return [stop if i == count - 1 else start + i * (stop - start) / (count - 1) for i in range(count)]


def build_empty_graph(compiled: CompiledFunction, bounds: IntegrationBounds, graph_points: int) -> GraphData:
    """Graph for degenerate bounds: only the curve and a single area point, no nodes."""
    return _build(compiled, bounds, graph_points, None, None)


def build_graph(
    compiled: CompiledFunction,
    strategy: IntegrationStrategy,
    result: IntegrationResult,
    graph_points: int,
) -> GraphData:
    return _build(compiled, result.bounds, graph_points, strategy, result)


def _build(
    compiled: CompiledFunction,
    bounds: IntegrationBounds,
    graph_points: int,
    strategy: IntegrationStrategy | None,
    result: IntegrationResult | None,
) -> GraphData:
    low, high = bounds.low, bounds.high
    width = high - low
    pad = CURVE_MARGIN * width if width > 0 else 1.0
    curve_x = _linspace(low - pad, high + pad, graph_points)
    area_x = _linspace(low, high, graph_points) if width > 0 else [low]

    curve = Series(curve_x, compiled.sample(curve_x))
    area = Series(area_x, compiled.sample(area_x))
    if result is None or strategy is None:
        return GraphData(curve, area, Series([], []), [])

    nodes = Series([x for x, _ in result.nodes], [fx for _, fx in result.nodes])
    per_panel = strategy.nodes_per_panel
    samples = max(MIN_SAMPLES_PER_PANEL, min(MAX_SAMPLES_PER_PANEL, graph_points // result.panel_count))
    nodes_t = [float(k) for k in strategy.local_nodes]
    curves: list[PanelCurve] = []
    for panel in result.panels:
        rows = result.evaluations[(panel.index - 1) * per_panel : panel.index * per_panel]
        xs, ys = sample_panel_polynomial(
            nodes_t, [row.fx for row in rows], panel.start, panel.end, result.step, samples
        )
        curves.append(PanelCurve(panel.index, xs, ys))
    return GraphData(curve, area, nodes, curves)
