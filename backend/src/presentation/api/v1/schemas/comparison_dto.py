from __future__ import annotations

from pydantic import BaseModel, Field

from src.presentation.api.v1.schemas.common_dto import (
    DTO,
    BoundsOut,
    BoundValue,
    ErrorBody,
    ExactOut,
    ExpressionOut,
    MethodSummary,
    WarningOut,
)


class CompareOptionsDTO(BaseModel):
    calculate_exact: bool = True


class CompareRequest(BaseModel):
    expression: str = Field(max_length=10_000, examples=["sin(x)"])
    variable: str = Field(default="x", max_length=16)
    lower_bound: BoundValue = Field(examples=[0])
    upper_bound: BoundValue = Field(examples=["pi"])
    methods: list[str] | None = Field(
        default=None, min_length=1, max_length=64, description="Defaults to all methods."
    )
    variant: str = Field(examples=["composite"])
    panel_count: int | None = Field(default=None, examples=[2])
    options: CompareOptionsDTO = Field(default_factory=CompareOptionsDTO)


class MethodResultOut(DTO):
    method: MethodSummary
    status: str
    approximation: float | None
    absolute_error: float | None
    relative_error: float | None
    function_evaluations: int | None
    error: ErrorBody | None


class CompareResponse(DTO):
    expression: ExpressionOut
    bounds: BoundsOut
    variant: str
    panel_count: int
    exact: ExactOut
    results: list[MethodResultOut]
    warnings: list[WarningOut]
