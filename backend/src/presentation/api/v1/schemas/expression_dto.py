from __future__ import annotations

from pydantic import BaseModel, Field

from src.presentation.api.v1.schemas.common_dto import DTO, ErrorBody


class ValidateExpressionRequest(BaseModel):
    expression: str = Field(max_length=10_000, examples=["sin(x)"])
    variable: str = Field(default="x", max_length=16)


class ValidateExpressionResponse(DTO):
    valid: bool
    canonical: str | None = None
    latex: str | None = None
    error: ErrorBody | None = None
