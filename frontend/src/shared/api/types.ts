/** Wire types mirroring docs/api-contract.md (v1). Keep in sync with the contract, never with UI needs. */

export type MethodId =
  | 'closed_trapezoid'
  | 'closed_simpson_13'
  | 'closed_simpson_38'
  | 'closed_boole'
  | 'open_midpoint'
  | 'open_newton_cotes_2'
  | 'open_newton_cotes_3'
  | 'open_newton_cotes_4'

export type MethodFamily = 'closed' | 'open'
export type Variant = 'simple' | 'composite'

export type ApiErrorCode =
  | 'INVALID_EXPRESSION'
  | 'EXPRESSION_TOO_COMPLEX'
  | 'INVALID_VARIABLE'
  | 'INVALID_BOUNDS'
  | 'INVALID_PANELS'
  | 'UNKNOWN_METHOD'
  | 'UNKNOWN_VARIANT'
  | 'FUNCTION_EVALUATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  /** Client-side codes (never sent by the server). */
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

export type EvaluationFailureReason = 'nan' | 'infinite' | 'domain' | 'division_by_zero'

export interface ApiErrorPayload {
  code: string
  message: string
  details: Record<string, unknown>
}

export type WarningCode =
  | 'EQUAL_BOUNDS'
  | 'POSSIBLE_SINGULARITY'
  | 'EXACT_TIMEOUT'
  | 'EXACT_UNAVAILABLE'
  | 'ESTIMATE_UNAVAILABLE'

export interface ApiWarning {
  code: string
  message: string
  details: Record<string, unknown>
}

export interface HealthResponse {
  status: string
  version: string
}

export interface MethodInfo {
  id: MethodId
  family: MethodFamily
  degree_of_exactness: number
  subintervals_per_panel: number
  nodes_per_panel: number
  error_order: number
  local_nodes: number[]
  local_weights: number[]
  formula_latex: string
}

export interface MethodsResponse {
  methods: MethodInfo[]
  variants: Variant[]
}

export interface MethodSummary {
  id: MethodId
  family: MethodFamily
  degree_of_exactness: number
  subintervals_per_panel: number
  nodes_per_panel: number
  error_order: number
}

export interface ValidateRequest {
  expression: string
  variable: string
}

export interface ValidateResponse {
  valid: boolean
  canonical: string | null
  latex: string | null
  error: ApiErrorPayload | null
}

export type BoundValue = number | string

export interface SolveOptions {
  calculate_exact: boolean
  generate_graph: boolean
  graph_points: number
  estimate_error: boolean
}

export interface SolveRequest {
  expression: string
  variable: string
  lower_bound: BoundValue
  upper_bound: BoundValue
  method: MethodId
  variant: Variant
  panel_count?: number
  options: SolveOptions
}

export type ExactStatus = 'computed' | 'disabled' | 'unavailable' | 'timeout'

export interface ExactResult {
  status: ExactStatus
  value: number | null
  latex: string | null
}

export interface ExpressionInfo {
  canonical: string
  latex: string
  variable: string
}

export interface BoundsInfo {
  lower: number
  upper: number
  lower_latex: string
  upper_latex: string
}

export interface EstimatedError {
  value: number
  method: string
  refined_approximation: number
  refined_panel_count: number
}

export interface EvaluationRow {
  index: number
  panel: number
  x: number
  fx: number
  weight: number
  contribution: number
  shared: boolean
}

export interface PanelRow {
  index: number
  start: number
  end: number
  approximation: number
}

/** `y` is null where f is undefined or not finite. */
export interface Series {
  x: number[]
  y: Array<number | null>
}

export interface ApproximationCurve extends Series {
  panel: number
}

export interface GraphData {
  curve: Series
  area: Series
  nodes: Series
  approximation_curves: ApproximationCurve[]
}

export interface SolveResponse {
  method: MethodSummary
  variant: Variant
  expression: ExpressionInfo
  bounds: BoundsInfo
  panel_count: number
  subinterval_count: number
  panel_width: number
  step: number
  approximation: number
  exact: ExactResult
  absolute_error: number | null
  relative_error: number | null
  estimated_error: EstimatedError | null
  function_evaluations: number
  evaluations: EvaluationRow[]
  panels: PanelRow[]
  graph: GraphData | null
  warnings: ApiWarning[]
}

export interface CompareRequest {
  expression: string
  variable: string
  lower_bound: BoundValue
  upper_bound: BoundValue
  methods?: MethodId[]
  variant: Variant
  panel_count?: number
  options: { calculate_exact: boolean }
}

export interface CompareResult {
  method: MethodSummary
  status: 'ok' | 'error'
  approximation: number | null
  absolute_error: number | null
  relative_error: number | null
  function_evaluations: number | null
  error: ApiErrorPayload | null
}

export interface CompareResponse {
  expression: ExpressionInfo
  bounds: BoundsInfo
  variant: Variant
  panel_count: number
  exact: ExactResult
  results: CompareResult[]
  warnings: ApiWarning[]
}
