"""Closed trapezoid rule: (h/2)[f(x0)+f(x1)], h = W."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class TrapezoidStrategy(PanelRuleStrategy):
    id = "closed_trapezoid"
    family = Family.CLOSED
    degree_of_exactness = 1
    subintervals_per_panel = 1
    formula_latex = r"\frac{h}{2}\left[f(x_0)+f(x_1)\right]"

    NODES: ClassVar[tuple[int, ...]] = (0, 1)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = (Fraction(1, 2), Fraction(1, 2))
