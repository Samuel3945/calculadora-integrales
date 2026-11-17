import { describe, expect, it } from 'vitest'
import type { CompareResponse, CompareResult } from '@/shared/api'
import { analyzeComparison, correctDigits } from './ranking'

const summary = (id: string) =>
  ({ id, family: 'closed', degree_of_exactness: 1, subintervals_per_panel: 1, nodes_per_panel: 2, error_order: 2 }) as CompareResult['method']

const ok = (id: string, abs: number, rel: number | null, evals: number): CompareResult => ({
  method: summary(id),
  status: 'ok',
  approximation: 1,
  absolute_error: abs,
  relative_error: rel,
  function_evaluations: evals,
  error: null,
})

const failed = (id: string): CompareResult => ({
  method: summary(id),
  status: 'error',
  approximation: null,
  absolute_error: null,
  relative_error: null,
  function_evaluations: null,
  error: { code: 'FUNCTION_EVALUATION_ERROR', message: 'x', details: { x: 0, reason: 'division_by_zero' } },
})

const response = (results: CompareResult[], status: 'computed' | 'unavailable' = 'computed'): CompareResponse => ({
  expression: { canonical: 'x', latex: 'x', variable: 'x' },
  bounds: { lower: 0, upper: 1, lower_latex: '0', upper_latex: '1' },
  variant: 'composite',
  panel_count: 2,
  exact: { status, value: status === 'computed' ? 1 : null, latex: null },
  results,
  warnings: [],
})

describe('correctDigits', () => {
  it('is -log10 clamped to [0, 16]', () => {
    expect(correctDigits(0.01)).toBeCloseTo(2)
    expect(correctDigits(1)).toBe(0)
    expect(correctDigits(5)).toBe(0)
    expect(correctDigits(1e-20)).toBe(16)
    expect(correctDigits(0)).toBe(16)
    expect(correctDigits(null)).toBeNull()
  })
})

describe('analyzeComparison', () => {
  it('flags the most accurate and the cheapest method among successful results', () => {
    const analysis = analyzeComparison(
      response([ok('a', 1e-1, 1e-1, 3), ok('b', 1e-5, 1e-5, 9), failed('c'), ok('d', 1e-2, 1e-2, 2)]),
    )
    expect(analysis.rows.map((r) => r.isBest)).toEqual([false, true, false, false])
    expect(analysis.rows.map((r) => r.isCheapest)).toEqual([false, false, false, true])
    expect(analysis.rows[2]?.digits).toBeNull()
    expect(analysis.axisMax).toBe(6)
  })

  it('hides accuracy information when the exact value is unavailable', () => {
    const analysis = analyzeComparison(response([ok('a', 0, null, 3), ok('b', 0, null, 5)], 'unavailable'))
    expect(analysis.exactAvailable).toBe(false)
    expect(analysis.rows.every((r) => !r.isBest && r.digits === null)).toBe(true)
  })

  it('does not flag «fewer evaluations» when all methods tie, and extends the axis for high precision', () => {
    const analysis = analyzeComparison(response([ok('a', 1e-13, 1e-13, 4), ok('b', 1e-14, 1e-14, 4)]))
    expect(analysis.rows.some((r) => r.isCheapest)).toBe(false)
    expect(analysis.axisMax).toBe(14)
  })
})
