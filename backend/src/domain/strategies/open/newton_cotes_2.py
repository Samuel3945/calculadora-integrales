"""Open Newton-Cotes, two interior points: (3h/2)[f(x1)+f(x2)], h = W/3."""

from __future__ import annotations

from fractions import Fraction
from typing import ClassVar

from src.domain.interfaces.integration_strategy import Family
from src.domain.strategies.base import PanelRuleStrategy


class OpenNewtonCotes2Strategy(PanelRuleStrategy):
    id = "open_newton_cotes_2"
    family = Family.OPEN
    degree_of_exactness = 1
    subintervals_per_panel = 3
    formula_latex = r"\frac{3h}{2}\left[f(x_1)+f(x_2)\right]"

    NODES: ClassVar[tuple[int, ...]] = (1, 2)
    WEIGHTS: ClassVar[tuple[Fraction, ...]] = (Fraction(3, 2), Fraction(3, 2))
