from __future__ import annotations

import pytest

from src.application.factories.strategy_factory import StrategyFactory
from src.domain.exceptions import UnknownMethodError
from src.domain.strategies.open.midpoint import MidpointStrategy

IDS = [
    "closed_trapezoid",
    "closed_simpson_13",
    "closed_simpson_38",
    "closed_boole",
    "open_midpoint",
    "open_newton_cotes_2",
    "open_newton_cotes_3",
    "open_newton_cotes_4",
]


def test_default_registry_has_the_eight_methods_in_order(factory: StrategyFactory) -> None:
    assert factory.ids() == IDS
    assert [s.id for s in factory.all()] == IDS


@pytest.mark.parametrize("method_id", IDS)
def test_get_returns_matching_strategy(factory: StrategyFactory, method_id: str) -> None:
    assert factory.get(method_id).id == method_id


def test_unknown_method(factory: StrategyFactory) -> None:
    with pytest.raises(UnknownMethodError) as info:
        factory.get("simpson")
    assert info.value.code == "UNKNOWN_METHOD"
    assert info.value.details["allowed"] == IDS


def test_new_strategies_can_be_registered_without_touching_use_cases() -> None:
    class Custom(MidpointStrategy):
        id = "custom_midpoint"

    f = StrategyFactory()
    f.register(Custom())
    assert f.ids() == ["custom_midpoint"]
