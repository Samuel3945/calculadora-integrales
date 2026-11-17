from __future__ import annotations

from fastapi import APIRouter, Depends

from src.application.dto import MethodInfo
from src.application.factories.strategy_factory import StrategyFactory
from src.domain.value_objects.integration_config import Variant
from src.presentation.api.v1.schemas.common_dto import HealthResponse, MethodsResponse
from src.presentation.dependencies import get_factory
from src.presentation.settings import API_VERSION

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=API_VERSION)


@router.get("/methods", response_model=MethodsResponse, summary="List numerical methods and variants")
def list_methods(factory: StrategyFactory = Depends(get_factory)) -> MethodsResponse:
    methods = [MethodInfo.from_strategy(strategy) for strategy in factory.all()]
    return MethodsResponse.model_validate(
        {"methods": methods, "variants": [variant.value for variant in Variant]}
    )
