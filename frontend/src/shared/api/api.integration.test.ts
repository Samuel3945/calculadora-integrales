/**
 * Contract check against a RUNNING backend. Skipped unless VITE_API_BASE_URL is set:
 *   (backend) .venv/bin/uvicorn src.presentation.main:app --port 8000
 *   (frontend) npm run test:api
 * It exercises the real shared/api functions and the request builders used by the UI.
 */
import { describe, expect, it } from 'vitest'
import { buildCompareRequest, buildSolveRequest, describeError } from '@/entities/integral'
import { ApiError } from './errors'
import { compareMethods, fetchHealth, fetchMethods, solveIntegral, validateExpression } from './endpoints'
import type { SolveRequest } from './types'

const live = Boolean(import.meta.env.VITE_API_BASE_URL)
const options = { calculateExact: true, estimateError: true, showGeometry: true, graphPoints: 120 }

const sinInput = {
  latex: '\\sin\\left(x\\right)',
  variable: 'x',
  lower: '0',
  upper: 'π',
  variant: 'composite' as const,
  panels: 2,
}

function solveRequest(overrides: Partial<Parameters<typeof buildSolveRequest>[0]> = {}): SolveRequest {
  const built = buildSolveRequest({ ...sinInput, methodId: 'closed_simpson_13', options, ...overrides })
  if (!built.ok) throw new Error(built.message)
  return built.request
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected the request to fail')
}

describe.skipIf(!live)('backend contract', () => {
  it('GET /health', async () => {
    expect(await fetchHealth()).toMatchObject({ status: 'ok' })
  })

  it('GET /methods returns the 8 methods with the fields the UI reads', async () => {
    const { methods, variants } = await fetchMethods()
    expect(methods).toHaveLength(8)
    expect(variants).toEqual(['simple', 'composite'])
    for (const m of methods) {
      expect(typeof m.formula_latex).toBe('string')
      expect(m.local_nodes).toHaveLength(m.nodes_per_panel)
      expect(m.local_weights).toHaveLength(m.nodes_per_panel)
      expect(m.error_order).toBeGreaterThan(0)
    }
  })

  it('POST /expressions/validate accepts the converter output and reports invalid input', async () => {
    const ok = await validateExpression({ expression: 'sin(x)', variable: 'x' })
    expect(ok).toMatchObject({ valid: true, canonical: 'sin(x)', error: null })
    expect(typeof ok.latex).toBe('string')
    const bad = await validateExpression({ expression: 'sin(', variable: 'x' })
    expect(bad.valid).toBe(false)
    expect(bad.error?.code).toBe('INVALID_EXPRESSION')
  })

  it('POST /integrals/solve with the payload built from the default UI state', async () => {
    const request = solveRequest()
    expect(request).toMatchObject({ expression: 'sin(x)', lower_bound: 0, upper_bound: 'pi', panel_count: 2 })
    const r = await solveIntegral(request)
    expect(r.approximation).toBeCloseTo(2.0045597549844207, 12)
    expect(r.exact).toMatchObject({ status: 'computed', value: 2 })
    expect(r.subinterval_count).toBe(4)
    expect(r.function_evaluations).toBe(5)
    expect(r.evaluations).toHaveLength(6)
    expect(r.evaluations.filter((e) => e.shared)).toHaveLength(2)
    expect(r.panels).toHaveLength(2)
    expect(r.estimated_error?.method).toBe('richardson')
    expect(r.graph?.curve.x).toHaveLength(request.options.graph_points)
    expect(r.graph?.nodes.x).toHaveLength(5)
    expect(r.graph?.approximation_curves).toHaveLength(2)
    expect(r.bounds.upper_latex).toBe('\\pi')
  })

  it('open methods never return endpoint nodes', async () => {
    const r = await solveIntegral(solveRequest({ methodId: 'open_midpoint', lower: '0', upper: '1', variant: 'simple' }))
    expect(r.graph?.nodes.x).toEqual([0.5])
    expect(r.evaluations.every((e) => e.x !== 0 && e.x !== 1)).toBe(true)
  })

  it('inverted and equal bounds', async () => {
    const inverted = await solveIntegral(solveRequest({ lower: 'π', upper: '0' }))
    expect(inverted.approximation).toBeLessThan(0)
    const equal = await solveIntegral(solveRequest({ lower: '1', upper: '1' }))
    expect(equal.approximation).toBe(0)
    expect(equal.evaluations).toEqual([])
    expect(equal.warnings.map((w) => w.code)).toContain('EQUAL_BOUNDS')
  })

  it('maps FUNCTION_EVALUATION_ERROR with x and a Spanish reason', async () => {
    const error = await failure(
      solveIntegral(solveRequest({ latex: '\\frac{1}{x}', lower: '0', upper: '1', methodId: 'closed_trapezoid' })),
    )
    expect(error.code).toBe('FUNCTION_EVALUATION_ERROR')
    const text = describeError(error)
    expect(text).toContain('x = 0')
    expect(text).toMatch(/división por cero|valor infinito/)
  })

  it('maps INVALID_PANELS and INVALID_BOUNDS', async () => {
    const base = solveRequest()
    const panels = await failure(solveIntegral({ ...base, panel_count: 1 }))
    expect(panels.code).toBe('INVALID_PANELS')
    expect(describeError(panels)).toMatch(/paneles/)
    const bounds = await failure(solveIntegral({ ...base, upper_bound: 'foo(1)' }))
    expect(['INVALID_BOUNDS', 'INVALID_EXPRESSION']).toContain(bounds.code)
  })

  it('POST /integrals/compare returns 8 results and per-method errors', async () => {
    const built = buildCompareRequest({ ...sinInput, calculateExact: true })
    if (!built.ok) throw new Error(built.message)
    const r = await compareMethods(built.request)
    expect(r.results).toHaveLength(8)
    expect(r.results.every((x) => x.status === 'ok')).toBe(true)
    expect(r.exact.status).toBe('computed')

    const singular = buildCompareRequest({ ...sinInput, latex: '\\frac{1}{\\sqrt{x}}', lower: '0', upper: '1', calculateExact: true })
    if (!singular.ok) throw new Error(singular.message)
    const mixed = await compareMethods(singular.request)
    const failed = mixed.results.filter((x) => x.status === 'error')
    expect(failed.length).toBeGreaterThan(0)
    expect(failed[0]?.error?.code).toBe('FUNCTION_EVALUATION_ERROR')
    expect(mixed.results.some((x) => x.status === 'ok')).toBe(true)
  })

  it('unknown routes become a mapped NOT_FOUND', async () => {
    const { http } = await import('./http')
    const error = await failure(http.get('/nope').then((r) => r.data))
    expect(error.code).toBe('NOT_FOUND')
    expect(describeError(error)).toMatch(/servidor/)
  })
})
