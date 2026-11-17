from __future__ import annotations

import math
from collections.abc import Callable, Sequence

from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.strategies.closed.boole import BooleStrategy
from src.domain.strategies.closed.simpson_one_third import SimpsonOneThirdStrategy
from src.domain.strategies.closed.simpson_three_eighths import SimpsonThreeEighthsStrategy
from src.domain.strategies.closed.trapezoid import TrapezoidStrategy
from src.domain.strategies.open.midpoint import MidpointStrategy
from src.domain.strategies.open.newton_cotes_2 import OpenNewtonCotes2Strategy
from src.domain.strategies.open.newton_cotes_3 import OpenNewtonCotes3Strategy
from src.domain.strategies.open.newton_cotes_4 import OpenNewtonCotes4Strategy
from src.domain.value_objects.integration_bounds import IntegrationBounds

ALL_STRATEGIES: list[IntegrationStrategy] = [
    TrapezoidStrategy(),
    SimpsonOneThirdStrategy(),
    SimpsonThreeEighthsStrategy(),
    BooleStrategy(),
    MidpointStrategy(),
    OpenNewtonCotes2Strategy(),
    OpenNewtonCotes3Strategy(),
    OpenNewtonCotes4Strategy(),
]
BY_ID = {s.id: s for s in ALL_STRATEGIES}


def vectorize(f: Callable[[float], float]) -> Callable[[Sequence[float]], list[float]]:
    return lambda xs: [f(x) for x in xs]


def problem(f: Callable[[float], float], a: float, b: float) -> IntegrationProblem:
    return IntegrationProblem(vectorize(f), "x", IntegrationBounds(a, b))


def approx(strategy: IntegrationStrategy, f: Callable[[float], float], a: float, b: float, r: int) -> float:
    return strategy.integrate(problem(f, a, b), r).approximation


E_MINUS_1 = math.e - 1.0
