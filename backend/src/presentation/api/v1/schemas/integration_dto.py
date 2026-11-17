from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from src.presentation.api.v1.schemas.common_dto import (
    DTO,
    BoundsOut,
    BoundValue,
    ExactOut,
    ExpressionOut,
    MethodSummary,
    WarningOut,
)


class SolveOptionsDTO(BaseModel):
    calculate_exact: bool = True
    generate_graph: bool = True
    graph_points: int = Field(default=300, ge=50, le=2000)
    estimate_error: bool = True


class SolveRequest(BaseModel):
    expression: str = Field(max_length=10_000, examples=["x**2"])
    variable: str = Field(default="x", max_length=16)
    lower_bound: BoundValue = Field(examples=[0])
    upper_bound: BoundValue = Field(examples=["pi"])
    method: str = Field(examples=["closed_simpson_13"])
    variant: str = Field(examples=["composite"])
    panel_count: int | None = Field(default=None, examples=[2])
    options: SolveOptionsDTO = Field(default_factory=SolveOptionsDTO)


class EstimatedErrorOut(DTO):
    value: float
    method: str
    refined_approximation: float
    refined_panel_count: int


class EvaluationOut(DTO):
    index: int
    panel: int
    x: float
    fx: float
    weight: float
    contribution: float
    shared: bool


class PanelOut(DTO):
    index: int
    start: float
    end: float
    approximation: float


class SeriesOut(DTO):
    x: list[float]
    y: list[float | None]


class PanelCurveOut(DTO):
    panel: int
    x: list[float]
    y: list[float]


class GraphOut(DTO):
    curve: SeriesOut
    area: SeriesOut
    nodes: SeriesOut
    approximation_curves: list[PanelCurveOut]


class SolveResponse(DTO):
    method: MethodSummary
    variant: str
    expression: ExpressionOut
    bounds: BoundsOut
    panel_count: int
    subinterval_count: int
    panel_width: float
    step: float
    approximation: float
    exact: ExactOut
    absolute_error: float | None
    relative_error: float | None
    estimated_error: EstimatedErrorOut | None
    function_evaluations: int
    evaluations: list[EvaluationOut]
    panels: list[PanelOut]
    graph: GraphOut | None
    warnings: list[WarningOut]


__all__ = ["Any", "SolveRequest", "SolveResponse"]
