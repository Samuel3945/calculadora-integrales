from __future__ import annotations

from fastapi import APIRouter, Depends

from src.application.dto import CalculateIntegralCommand, SolveOptions
from src.application.use_cases.calculate_integral import CalculateIntegralUseCase
from src.presentation.api.v1.schemas.common_dto import ErrorEnvelope
from src.presentation.api.v1.schemas.integration_dto import SolveRequest, SolveResponse
from src.presentation.dependencies import get_calculate_use_case

router = APIRouter(prefix="/integrals", tags=["integrals"])


@router.post(
    "/solve",
    response_model=SolveResponse,
    responses={422: {"model": ErrorEnvelope}},
    summary="Approximate a definite integral with one numerical method",
)
def solve(
    body: SolveRequest, use_case: CalculateIntegralUseCase = Depends(get_calculate_use_case)
) -> SolveResponse:
    options = body.options
    command = CalculateIntegralCommand(
        expression=body.expression,
        variable=body.variable,
        lower_bound=body.lower_bound,
        upper_bound=body.upper_bound,
        method=body.method,
        variant=body.variant,
        panel_count=body.panel_count,
        options=SolveOptions(
            calculate_exact=options.calculate_exact,
            generate_graph=options.generate_graph,
            graph_points=options.graph_points,
            estimate_error=options.estimate_error,
        ),
    )
    return SolveResponse.model_validate(use_case.execute(command))
