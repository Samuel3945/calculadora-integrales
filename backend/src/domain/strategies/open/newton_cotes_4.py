"""Open Newton-Cotes, four interior points: (5h/24)[11f(x1)+f(x2)+f(x3)+11f(x4)], h = W/5."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class OpenNewtonCotes4Strategy(PanelRuleStrategy):
    id = "open_newton_cotes_4"
    family = Family.OPEN
    degree_of_exactness = 3
    subintervals_per_panel = 5
    formula_latex = r"\frac{5h}{24}\left[11f(x_1)+f(x_2)+f(x_3)+11f(x_4)\right]"

    NODES: ClassVar[tuple[int, ...]] = (1, 2, 3, 4)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = tuple(Fraction(5, 24) * c for c in (11, 1, 1, 11))
