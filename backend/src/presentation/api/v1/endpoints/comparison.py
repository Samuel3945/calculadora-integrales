from __future__ import annotations

from fastapi import APIRouter, Depends

from src.application.dto import CompareMethodsCommand
from src.application.use_cases.compare_methods import CompareMethodsUseCase
from src.presentation.api.v1.schemas.common_dto import ErrorEnvelope
from src.presentation.api.v1.schemas.comparison_dto import CompareRequest, CompareResponse
from src.presentation.dependencies import get_compare_use_case

router = APIRouter(prefix="/integrals", tags=["integrals"])


@router.post(
    "/compare",
    response_model=CompareResponse,
    responses={422: {"model": ErrorEnvelope}},
    summary="Compare several numerical methods on the same integral",
)
def compare(
    body: CompareRequest, use_case: CompareMethodsUseCase = Depends(get_compare_use_case)
) -> CompareResponse:
    command = CompareMethodsCommand(
        expression=body.expression,
        variable=body.variable,
        lower_bound=body.lower_bound,
        upper_bound=body.upper_bound,
        variant=body.variant,
        panel_count=body.panel_count,
        methods=tuple(body.methods) if body.methods else None,
        calculate_exact=body.options.calculate_exact,
    )
    return CompareResponse.model_validate(use_case.execute(command))
