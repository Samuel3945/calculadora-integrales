"""Midpoint rule: W*f(m) = 2h*f(x1), with h = W/2 (one interior node per panel)."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class MidpointStrategy(PanelRuleStrategy):
    id = "open_midpoint"
    family = Family.OPEN
    degree_of_exactness = 1
    subintervals_per_panel = 2
    formula_latex = r"2h\,f(x_1)"

    NODES: ClassVar[tuple[int, ...]] = (1,)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = (Fraction(2),)
