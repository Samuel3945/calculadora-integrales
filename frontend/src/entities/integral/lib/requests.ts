import type { CompareRequest, SolveRequest } from '@/shared/api'
import { latexToCanonical, normalizeBound, toBoundPayload } from '@/shared/lib/math-input'
import type { IntegralInputs } from '../model/types'

export type RequestBuild<T> = { ok: true; request: T; key: string } | { ok: false; message: string }

type Common = Pick<IntegralInputs, 'latex' | 'variable' | 'lower' | 'upper' | 'variant' | 'panels'>

type CommonBuild =
  | { ok: true; expression: string; variable: string; lower: number | string; upper: number | string }
  | { ok: false; message: string }

function buildCommon({ latex, variable, lower, upper }: Pick<Common, 'latex' | 'variable' | 'lower' | 'upper'>): CommonBuild {
  const expression = latexToCanonical(latex, { variable })
  if (!expression.ok) return expression
  const low = normalizeBound(lower)
  if (!low.ok) return { ok: false, message: `Límite inferior: ${low.message}` }
  const high = normalizeBound(upper)
  if (!high.ok) return { ok: false, message: `Límite superior: ${high.message}` }
  return {
    ok: true,
    expression: expression.canonical,
    variable,
    lower: toBoundPayload(low.value),
    upper: toBoundPayload(high.value),
  }
}

/** The contract ignores panel_count for `simple`; it is only sent for the composite variant. */
const panelFields = (variant: Common['variant'], panels: number): { panel_count?: number } =>
  variant === 'composite' ? { panel_count: panels } : {}

export function buildSolveRequest(
  input: Common & Pick<IntegralInputs, 'methodId' | 'options'>,
): RequestBuild<SolveRequest> {
  const common = buildCommon(input)
  if (!common.ok) return common
  const request: SolveRequest = {
    expression: common.expression,
    variable: common.variable,
    lower_bound: common.lower,
    upper_bound: common.upper,
    method: input.methodId,
    variant: input.variant,
    ...panelFields(input.variant, input.panels),
    options: {
      calculate_exact: input.options.calculateExact,
      generate_graph: true,
      graph_points: input.options.graphPoints,
      estimate_error: input.options.estimateError,
    },
  }
  return { ok: true, request, key: JSON.stringify(request) }
}

export function buildCompareRequest(input: Common & { calculateExact: boolean }): RequestBuild<CompareRequest> {
  const common = buildCommon(input)
  if (!common.ok) return common
  const request: CompareRequest = {
    expression: common.expression,
    variable: common.variable,
    lower_bound: common.lower,
    upper_bound: common.upper,
    variant: input.variant,
    ...panelFields(input.variant, input.panels),
    options: { calculate_exact: input.calculateExact },
  }
  return { ok: true, request, key: JSON.stringify(request) }
}
