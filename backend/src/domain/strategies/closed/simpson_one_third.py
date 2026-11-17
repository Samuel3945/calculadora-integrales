"""Closed Simpson 1/3 rule: (h/3)[f(x0)+4f(x1)+f(x2)], h = W/2."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class SimpsonOneThirdStrategy(PanelRuleStrategy):
    id = "closed_simpson_13"
    family = Family.CLOSED
    degree_of_exactness = 3
    subintervals_per_panel = 2
    formula_latex = r"\frac{h}{3}\left[f(x_0)+4f(x_1)+f(x_2)\right]"

    NODES: ClassVar[tuple[int, ...]] = (0, 1, 2)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = (Fraction(1, 3), Fraction(4, 3), Fraction(1, 3))
