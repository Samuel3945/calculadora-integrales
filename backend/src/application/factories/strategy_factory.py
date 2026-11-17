"""Strategy registry: id -> strategy. Adding a rule means registering it here, nothing else."""

from __future__ import annotations

from collections.abc import Iterable

from src.domain.exceptions import UnknownMethodError
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.strategies.closed.boole import BooleStrategy
from src.domain.strategies.closed.simpson_one_third import SimpsonOneThirdStrategy
from src.domain.strategies.closed.simpson_three_eighths import SimpsonThreeEighthsStrategy
from src.domain.strategies.closed.trapezoid import TrapezoidStrategy
from src.domain.strategies.open.midpoint import MidpointStrategy
from src.domain.strategies.open.newton_cotes_2 import OpenNewtonCotes2Strategy
from src.domain.strategies.open.newton_cotes_3 import OpenNewtonCotes3Strategy
from src.domain.strategies.open.newton_cotes_4 import OpenNewtonCotes4Strategy

# Order here is the order exposed by GET /methods and used as the default for compare.
DEFAULT_STRATEGIES: tuple[type[IntegrationStrategy], ...] = (
    TrapezoidStrategy,
    SimpsonOneThirdStrategy,
    SimpsonThreeEighthsStrategy,
    BooleStrategy,
    MidpointStrategy,
    OpenNewtonCotes2Strategy,
    OpenNewtonCotes3Strategy,
    OpenNewtonCotes4Strategy,
)


class StrategyFactory:
    def __init__(self, strategies: Iterable[IntegrationStrategy] = ()) -> None:
        self._registry: dict[str, IntegrationStrategy] = {}
        for strategy in strategies:
            self.register(strategy)

    @classmethod
    def default(cls) -> StrategyFactory:
        return cls(strategy_class() for strategy_class in DEFAULT_STRATEGIES)

    def register(self, strategy: IntegrationStrategy) -> None:
        self._registry[strategy.id] = strategy

    def get(self, method_id: str) -> IntegrationStrategy:
        try:
            return self._registry[method_id]
        except KeyError:
            raise UnknownMethodError(
                f"unknown method {method_id!r}", {"method": method_id, "allowed": list(self._registry)}
            ) from None

    def all(self) -> list[IntegrationStrategy]:
        return list(self._registry.values())

    def ids(self) -> list[str]:
        return list(self._registry)
