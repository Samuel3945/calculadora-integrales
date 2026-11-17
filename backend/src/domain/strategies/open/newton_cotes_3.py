"""Open Newton-Cotes, three interior points: (4h/3)[2f(x1)-f(x2)+2f(x3)], h = W/4."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class OpenNewtonCotes3Strategy(PanelRuleStrategy):
    id = "open_newton_cotes_3"
    family = Family.OPEN
    degree_of_exactness = 3
    subintervals_per_panel = 4
    formula_latex = r"\frac{4h}{3}\left[2f(x_1)-f(x_2)+2f(x_3)\right]"

    NODES: ClassVar[tuple[int, ...]] = (1, 2, 3)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = tuple(Fraction(4, 3) * c for c in (2, -1, 2))
