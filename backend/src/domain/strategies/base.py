"""Template-method base shared by all eight rules (simple = 1 panel, composite = r panels)."""

from __future__ import annotations

import math
from collections import Counter
from fractions import Fraction
from typing import ClassVar

from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.entities.integration_result import IntegrationResult, PanelResult
from src.domain.exceptions import FunctionEvaluationError
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.value_objects.evaluation_point import EvaluationPoint


class PanelRuleStrategy(IntegrationStrategy):
    """Applies a fixed local rule on every panel and sums the panel approximations.

    Subclasses only declare data: ``NODES`` (integer positions in units of ``h``) and
    ``WEIGHTS`` (exact ``Fraction`` weights in units of ``h``), plus the metadata attributes
    required by :class:`IntegrationStrategy`.

    Geometry, for ``r`` panels over ``[a, b]``::

        W = (b - a) / r              panel width (signed)
        h = W / subintervals_per_panel
        x = a + p*W + k*h            node k of panel p (0-based), computed from integers

    Nodes are never produced by accumulating floats. A node that two adjacent panels share
    (closed rules) is identified by its global integer index ``p*n + k`` and evaluated once.
    """

    NODES: ClassVar[tuple[int, ...]]
    WEIGHTS: ClassVar[tuple[Fraction, ...]]

    @property
    def local_nodes(self) -> tuple[int, ...]:
        return self.NODES

    @property
    def local_weights(self) -> tuple[float, ...]:
        return tuple(float(w) for w in self.WEIGHTS)

    # -- template method -------------------------------------------------------------------
    def integrate(self, problem: IntegrationProblem, panel_count: int) -> IntegrationResult:
        a, b = problem.bounds.lower, problem.bounds.upper
        r = panel_count
        n = self.subintervals_per_panel
        panel_width = (b - a) / r
        step = panel_width / n
        nodes = self.local_nodes
        weights = self.local_weights

        occurrences: Counter[int] = Counter(p * n + k for p in range(r) for k in nodes)
        unique_x: dict[int, float] = {}
        for p in range(r):
            for k in nodes:
                g = p * n + k
                if g not in unique_x:
                    unique_x[g] = self._node_x(a, b, panel_width, step, r, p, k)

        fx_by_index = self._evaluate(problem, unique_x)

        evaluations: list[EvaluationPoint] = []
        panels: list[PanelResult] = []
        row = 0
        for p in range(r):
            panel_sum = 0.0
            for k, local_weight in zip(nodes, weights, strict=True):
                g = p * n + k
                x, fx = unique_x[g], fx_by_index[g]
                weight = local_weight * step
                contribution = weight * fx
                if not math.isfinite(contribution):
                    raise FunctionEvaluationError(x, "infinite")
                row += 1
                panel_sum += contribution
                evaluations.append(
                    EvaluationPoint(row, p + 1, x, fx, weight, contribution, occurrences[g] > 1)
                )
            start = a + p * panel_width
            end = b if p == r - 1 else a + (p + 1) * panel_width
            panels.append(PanelResult(p + 1, start, end, panel_sum))

        approximation = sum(panel.approximation for panel in panels)
        if not math.isfinite(approximation):
            raise FunctionEvaluationError(b, "infinite")
        return IntegrationResult(
            method_id=self.id,
            bounds=problem.bounds,
            panel_count=r,
            subinterval_count=r * n,
            panel_width=panel_width,
            step=step,
            approximation=approximation,
            evaluations=tuple(evaluations),
            panels=tuple(panels),
            nodes=tuple((x, fx_by_index[g]) for g, x in unique_x.items()),
        )

    # -- helpers ---------------------------------------------------------------------------
    def _node_x(self, a: float, b: float, w: float, h: float, r: int, p: int, k: int) -> float:
        n = self.subintervals_per_panel
        if k == 0:
            return a + p * w
        if k == n:  # panel end: use the next panel's start so shared nodes agree exactly
            return b if p == r - 1 else a + (p + 1) * w
        return a + p * w + k * h

    @staticmethod
    def _evaluate(problem: IntegrationProblem, unique_x: dict[int, float]) -> dict[int, float]:
        indices = list(unique_x)
        xs = [unique_x[g] for g in indices]
        values = problem.function(xs)
        if len(values) != len(xs):
            raise ValueError("integrand returned a different number of values than nodes")
        result: dict[int, float] = {}
        for g, x, value in zip(indices, xs, values, strict=True):
            fx = float(value)
            if math.isnan(fx):
                raise FunctionEvaluationError(x, "nan")
            if math.isinf(fx):
                raise FunctionEvaluationError(x, "infinite")
            result[g] = fx
        return result
