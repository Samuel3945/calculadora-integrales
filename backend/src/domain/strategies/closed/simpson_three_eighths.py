"""Closed Simpson 3/8 rule: (3h/8)[f(x0)+3f(x1)+3f(x2)+f(x3)], h = W/3."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class SimpsonThreeEighthsStrategy(PanelRuleStrategy):
    id = "closed_simpson_38"
    family = Family.CLOSED
    degree_of_exactness = 3
    subintervals_per_panel = 3
    formula_latex = r"\frac{3h}{8}\left[f(x_0)+3f(x_1)+3f(x_2)+f(x_3)\right]"

    NODES: ClassVar[tuple[int, ...]] = (0, 1, 2, 3)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = tuple(Fraction(3, 8) * c for c in (1, 3, 3, 1))
