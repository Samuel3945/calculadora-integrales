"""Closed Boole rule: (2h/45)[7f(x0)+32f(x1)+12f(x2)+32f(x3)+7f(x4)], h = W/4."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class BooleStrategy(PanelRuleStrategy):
    id = "closed_boole"
    family = Family.CLOSED
    degree_of_exactness = 5
    subintervals_per_panel = 4
    formula_latex = r"\frac{2h}{45}\left[7f(x_0)+32f(x_1)+12f(x_2)+32f(x_3)+7f(x_4)\right]"

    NODES: ClassVar[tuple[int, ...]] = (0, 1, 2, 3, 4)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = tuple(Fraction(2, 45) * c for c in (7, 32, 12, 32, 7))
