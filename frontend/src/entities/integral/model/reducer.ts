import { GRAPH_POINT_LIMITS, PANEL_LIMITS } from '@/shared/config'
import { METHOD_IDS_BY_FAMILY } from '../config/catalog'
import type {
  ComparedSnapshot,
  IntegralOptions,
  IntegralState,
  MethodFamily,
  MethodId,
  SolvedSnapshot,
  Variant,
} from './types'

export const initialIntegralState: IntegralState = {
  latex: '\\sin\\left(x\\right)',
  variable: 'x',
  lower: '0',
  upper: 'π',
  family: 'closed',
  methodId: 'closed_simpson_13',
  variant: 'composite',
  panels: 2,
  options: { calculateExact: true, estimateError: true, showGeometry: true, graphPoints: GRAPH_POINT_LIMITS.default },
  solved: null,
  compared: null,
}

export type IntegralAction =
  | { type: 'latexChanged'; latex: string }
  | { type: 'variableChanged'; variable: string }
  | { type: 'lowerChanged'; value: string }
  | { type: 'upperChanged'; value: string }
  | { type: 'familyChanged'; family: MethodFamily }
  | { type: 'methodChanged'; methodId: MethodId }
  | { type: 'variantChanged'; variant: Variant }
  | { type: 'panelsChanged'; panels: number }
  | { type: 'optionChanged'; patch: Partial<IntegralOptions> }
  | { type: 'solved'; snapshot: SolvedSnapshot }
  | { type: 'compared'; snapshot: ComparedSnapshot }
  | { type: 'solveFailed' }
  | { type: 'compareFailed' }

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export function clampPanels(value: number): number {
  return clamp(Math.round(Number.isFinite(value) ? value : PANEL_LIMITS.min), PANEL_LIMITS.min, PANEL_LIMITS.max)
}

export function clampGraphPoints(value: number): number {
  return clamp(
    Math.round(Number.isFinite(value) ? value : GRAPH_POINT_LIMITS.default),
    GRAPH_POINT_LIMITS.min,
    GRAPH_POINT_LIMITS.max,
  )
}

export function integralReducer(state: IntegralState, action: IntegralAction): IntegralState {
  switch (action.type) {
    case 'latexChanged':
      return state.latex === action.latex ? state : { ...state, latex: action.latex }
    case 'variableChanged':
      return { ...state, variable: action.variable }
    case 'lowerChanged':
      return { ...state, lower: action.value }
    case 'upperChanged':
      return { ...state, upper: action.value }
    case 'familyChanged': {
      if (state.family === action.family) return state
      return { ...state, family: action.family, methodId: METHOD_IDS_BY_FAMILY[action.family][0] as MethodId }
    }
    case 'methodChanged':
      return { ...state, methodId: action.methodId }
    case 'variantChanged':
      return { ...state, variant: action.variant, panels: action.variant === 'composite' ? clampPanels(state.panels) : state.panels }
    case 'panelsChanged':
      return { ...state, panels: clampPanels(action.panels) }
    case 'optionChanged': {
      const options = { ...state.options, ...action.patch }
      options.graphPoints = clampGraphPoints(options.graphPoints)
      return { ...state, options }
    }
    case 'solved':
      return { ...state, solved: action.snapshot }
    case 'compared':
      return { ...state, compared: action.snapshot }
    // a failed run must never leave an earlier (unrelated) result on screen
    case 'solveFailed':
      return { ...state, solved: null }
    case 'compareFailed':
      return { ...state, compared: null }
  }
}
