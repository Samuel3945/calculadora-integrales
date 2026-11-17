import type {
  CompareResponse,
  MethodFamily,
  MethodId,
  MethodInfo,
  SolveResponse,
  Variant,
} from '@/shared/api'

export type { MethodFamily, MethodId, Variant }
export type {
  ApiWarning,
  CompareResponse,
  CompareResult,
  EstimatedError,
  EvaluationRow,
  ExactResult,
  GraphData,
  MethodInfo,
  MethodSummary,
  PanelRow,
  SolveResponse,
} from '@/shared/api'

/** Method info from GET /methods merged with the Spanish catalogue copy. */
export interface MethodView extends MethodInfo {
  name: string
  shortName: string
  description: string
}

export interface IntegralOptions {
  calculateExact: boolean
  estimateError: boolean
  /** Display only: toggles the approximation curves already present in the response. */
  showGeometry: boolean
  graphPoints: number
}

/** User inputs. Bounds are kept as typed text, in ONE place, shared by every view of them. */
export interface IntegralInputs {
  latex: string
  variable: string
  lower: string
  upper: string
  family: MethodFamily
  methodId: MethodId
  variant: Variant
  panels: number
  options: IntegralOptions
}

export interface SolvedSnapshot {
  /** Serialised request that produced the response; compared with the current one to detect staleness. */
  key: string
  response: SolveResponse
}

export interface ComparedSnapshot {
  key: string
  response: CompareResponse
}

export interface IntegralState extends IntegralInputs {
  solved: SolvedSnapshot | null
  compared: ComparedSnapshot | null
}
