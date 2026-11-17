import { describe, expect, it } from 'vitest'
import { buildCompareRequest, buildSolveRequest } from './requests'

const base = {
  latex: '\\sin\\left(x\\right)',
  variable: 'x',
  lower: '0',
  upper: 'π',
  variant: 'composite' as const,
  panels: 2,
}
const options = { calculateExact: true, estimateError: true, showGeometry: true, graphPoints: 300 }

describe('buildSolveRequest', () => {
  it('builds the contract payload from UI state', () => {
    const built = buildSolveRequest({ ...base, methodId: 'closed_simpson_13', options })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.request).toEqual({
      expression: 'sin(x)',
      variable: 'x',
      lower_bound: 0,
      upper_bound: 'pi',
      method: 'closed_simpson_13',
      variant: 'composite',
      panel_count: 2,
      options: { calculate_exact: true, generate_graph: true, graph_points: 300, estimate_error: true },
    })
  })

  it('omits panel_count for the simple variant', () => {
    const built = buildSolveRequest({ ...base, variant: 'simple', methodId: 'open_midpoint', options })
    expect(built.ok && 'panel_count' in built.request).toBe(false)
  })

  it('reports conversion and bound errors in Spanish', () => {
    expect(buildSolveRequest({ ...base, latex: '\\int x', methodId: 'closed_boole', options })).toMatchObject({ ok: false })
    expect(buildSolveRequest({ ...base, lower: '', methodId: 'closed_boole', options })).toMatchObject({
      ok: false,
      message: expect.stringContaining('Límite inferior'),
    })
    expect(buildSolveRequest({ ...base, upper: 'x;y', methodId: 'closed_boole', options })).toMatchObject({
      ok: false,
      message: expect.stringContaining('Límite superior'),
    })
  })

  it('keeps a stable key that ignores display-only options', () => {
    const a = buildSolveRequest({ ...base, methodId: 'closed_boole', options })
    const b = buildSolveRequest({ ...base, methodId: 'closed_boole', options: { ...options, showGeometry: false } })
    expect(a.ok && b.ok && a.key === b.key).toBe(true)
  })
})

describe('buildCompareRequest', () => {
  it('sends the integral, variant and panels without a method list', () => {
    const built = buildCompareRequest({ ...base, calculateExact: false })
    expect(built.ok && built.request).toEqual({
      expression: 'sin(x)',
      variable: 'x',
      lower_bound: 0,
      upper_bound: 'pi',
      variant: 'composite',
      panel_count: 2,
      options: { calculate_exact: false },
    })
  })
})
