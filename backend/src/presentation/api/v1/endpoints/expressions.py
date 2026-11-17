from __future__ import annotations

from fastapi import APIRouter, Depends

from src.application.use_cases.validate_expression import ValidateExpressionUseCase
from src.presentation.api.v1.schemas.common_dto import ErrorEnvelope
from src.presentation.api.v1.schemas.expression_dto import ValidateExpressionRequest, ValidateExpressionResponse
from src.presentation.dependencies import get_validate_use_case

router = APIRouter(prefix="/expressions", tags=["expressions"])


@router.post(
    "/validate",
    response_model=ValidateExpressionResponse,
    responses={422: {"model": ErrorEnvelope}},
    summary="Validate an expression against the safe grammar",
)
def validate_expression(
    body: ValidateExpressionRequest, use_case: ValidateExpressionUseCase = Depends(get_validate_use_case)
) -> ValidateExpressionResponse:
    return ValidateExpressionResponse.model_validate(use_case.execute(body.expression, body.variable))
