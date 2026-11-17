from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, StrictFloat, StrictInt

# A bound is a JSON number or a constant expression such as "pi/2".
BoundValue = StrictInt | StrictFloat | str


class DTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorBody(DTO):
    code: str
    message: str
    details: dict[str, Any] = {}


class ErrorEnvelope(DTO):
    error: ErrorBody


class MethodSummary(DTO):
    id: str
    family: str
    degree_of_exactness: int
    subintervals_per_panel: int
    nodes_per_panel: int
    error_order: int


class MethodDetail(MethodSummary):
    local_nodes: list[int]
    local_weights: list[float]
    formula_latex: str


class ExpressionOut(DTO):
    canonical: str
    latex: str
    variable: str


class BoundsOut(DTO):
    lower: float
    upper: float
    lower_latex: str
    upper_latex: str


class WarningOut(DTO):
    code: str
    message: str
    details: dict[str, Any] = {}


class ExactOut(DTO):
    status: str
    value: float | None = None
    latex: str | None = None


class HealthResponse(DTO):
    status: str
    version: str


class MethodsResponse(DTO):
    methods: list[MethodDetail]
    variants: list[str]
