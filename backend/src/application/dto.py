"""Plain input/output structures of the use cases (framework-free)."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.application.ports.symbolic_integrator import ExactResult
from src.domain.entities.integration_result import PanelResult
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.value_objects.evaluation_point import EvaluationPoint

Bound = str | int | float


@dataclass(frozen=True, slots=True)
class MethodInfo:
    id: str
    family: str
    degree_of_exactness: int
    subintervals_per_panel: int
    nodes_per_panel: int
    error_order: int
    local_nodes: tuple[int, ...]
    local_weights: tuple[float, ...]
    formula_latex: str

    @classmethod
    def from_strategy(cls, strategy: IntegrationStrategy) -> MethodInfo:
        return cls(
            id=strategy.id,
            family=str(strategy.family),
            degree_of_exactness=strategy.degree_of_exactness,
            subintervals_per_panel=strategy.subintervals_per_panel,
            nodes_per_panel=strategy.nodes_per_panel,
            error_order=strategy.error_order,
            local_nodes=strategy.local_nodes,
            local_weights=strategy.local_weights,
            formula_latex=strategy.formula_latex,
        )


@dataclass(frozen=True, slots=True)
class ExpressionInfo:
    canonical: str
    latex: str
    variable: str


@dataclass(frozen=True, slots=True)
class BoundsInfo:
    lower: float
    upper: float
    lower_latex: str
    upper_latex: str


@dataclass(frozen=True, slots=True)
class ResultWarning:
    code: str
    message: str
    details: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class EstimatedError:
    value: float
    method: str
    refined_approximation: float
    refined_panel_count: int


@dataclass(frozen=True, slots=True)
class Series:
    x: list[float]
    y: list[float | None]


@dataclass(frozen=True, slots=True)
class PanelCurve:
    panel: int
    x: list[float]
    y: list[float]


@dataclass(frozen=True, slots=True)
class GraphData:
    curve: Series
    area: Series
    nodes: Series
    approximation_curves: list[PanelCurve]


@dataclass(frozen=True, slots=True)
class SolveOptions:
    calculate_exact: bool = True
    generate_graph: bool = True
    graph_points: int = 300
    estimate_error: bool = True


@dataclass(frozen=True, slots=True)
class CalculateIntegralCommand:
    expression: str
    variable: str
    lower_bound: Bound
    upper_bound: Bound
    method: str
    variant: str
    panel_count: int | None = None
    options: SolveOptions = field(default_factory=SolveOptions)


@dataclass(frozen=True, slots=True)
class CalculateIntegralOutput:
    method: MethodInfo
    variant: str
    expression: ExpressionInfo
    bounds: BoundsInfo
    panel_count: int
    subinterval_count: int
    panel_width: float
    step: float
    approximation: float
    exact: ExactResult
    absolute_error: float | None
    relative_error: float | None
    estimated_error: EstimatedError | None
    function_evaluations: int
    evaluations: tuple[EvaluationPoint, ...]
    panels: tuple[PanelResult, ...]
    graph: GraphData | None
    warnings: list[ResultWarning]


@dataclass(frozen=True, slots=True)
class CompareMethodsCommand:
    expression: str
    variable: str
    lower_bound: Bound
    upper_bound: Bound
    variant: str
    panel_count: int | None = None
    methods: tuple[str, ...] | None = None
    calculate_exact: bool = True


@dataclass(frozen=True, slots=True)
class MethodError:
    code: str
    message: str
    details: dict[str, object]


@dataclass(frozen=True, slots=True)
class MethodComparison:
    method: MethodInfo
    status: str  # "ok" | "error"
    approximation: float | None
    absolute_error: float | None
    relative_error: float | None
    function_evaluations: int | None
    error: MethodError | None


@dataclass(frozen=True, slots=True)
class CompareMethodsOutput:
    expression: ExpressionInfo
    bounds: BoundsInfo
    variant: str
    panel_count: int
    exact: ExactResult
    results: list[MethodComparison]
    warnings: list[ResultWarning]


@dataclass(frozen=True, slots=True)
class ValidateExpressionOutput:
    valid: bool
    canonical: str | None
    latex: str | None
    error: MethodError | None
