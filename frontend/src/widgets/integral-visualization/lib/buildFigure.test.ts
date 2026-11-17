import { describe, expect, it } from 'vitest'
import type { SolveResponse } from '@/entities/integral'
import { buildFigure, chooseYRange } from './buildFigure'

function response(overrides: Partial<SolveResponse> = {}): SolveResponse {
  return {
    method: { id: 'closed_simpson_13', family: 'closed', degree_of_exactness: 3, subintervals_per_panel: 2, nodes_per_panel: 3, error_order: 4 },
    variant: 'composite',
    expression: { canonical: 'sin(x)', latex: '\\sin{x}', variable: 'x' },
    bounds: { lower: 0, upper: 3, lower_latex: '0', upper_latex: '3' },
    panel_count: 2,
    subinterval_count: 4,
    panel_width: 1.5,
    step: 0.75,
    approximation: 2,
    exact: { status: 'computed', value: 2, latex: '2' },
    absolute_error: 0,
    relative_error: 0,
    estimated_error: null,
    function_evaluations: 5,
    evaluations: [
      { index: 1, panel: 1, x: 0, fx: 0, weight: 0.25, contribution: 0, shared: false },
      { index: 2, panel: 1, x: 1.5, fx: 1, weight: 1, contribution: 1, shared: true },
      { index: 3, panel: 2, x: 1.5, fx: 1, weight: 1, contribution: 1, shared: true },
    ],
    panels: [
      { index: 1, start: 0, end: 1.5, approximation: 1 },
      { index: 2, start: 1.5, end: 3, approximation: 1 },
    ],
    graph: {
      curve: { x: [-0.3, 0, 1.5, 3, 3.3], y: [null, 0, 1, 0.1, 0] },
      area: { x: [0, 1.5, 3], y: [0, 1, 0.1] },
      nodes: { x: [0, 1.5], y: [0, 1] },
      approximation_curves: [
        { panel: 1, x: [0, 1.5], y: [0, 1] },
        { panel: 2, x: [1.5, 3], y: [1, 0.1] },
      ],
    },
    warnings: [],
    ...overrides,
  }
}

describe('buildFigure', () => {
  it('builds area, curve, approximation and node traces and keeps null gaps', () => {
    const { data, hasApproximation, hasSharedNodes } = buildFigure(response(), { showGeometry: true, compact: false })
    expect(data.map((t) => t.name)).toEqual(['Área de integración', 'f(x)', 'Aproximación geométrica', 'Nodos evaluados'])
    expect((data[1] as { y: unknown[] }).y[0]).toBeNull()
    expect(hasApproximation).toBe(true)
    expect(hasSharedNodes).toBe(true)
  })

  it('merges panel curves into one dashed trace separated by a null', () => {
    const { data } = buildFigure(response(), { showGeometry: true, compact: false })
    const approx = data[2] as { x: Array<number | null>; line: { dash: string } }
    expect(approx.x).toEqual([0, 1.5, null, 1.5, 3])
    expect(approx.line.dash).toBe('dash')
  })

  it('hides the approximation when geometry is off and never invents nodes', () => {
    const { data } = buildFigure(response(), { showGeometry: false, compact: false })
    expect(data.some((t) => t.name === 'Aproximación geométrica')).toBe(false)
    expect((data.at(-1) as { x: number[] }).x).toEqual([0, 1.5])
  })

  it('draws a and b lines and one divider between the two panels', () => {
    const { layout } = buildFigure(response(), { showGeometry: true, compact: false })
    expect(layout.shapes).toHaveLength(3)
    expect(layout.annotations?.map((a) => a.text)).toEqual(['a = 0', 'b = 3', 'Panel 1', 'Panel 2'])
  })

  it('returns an empty figure without graph data', () => {
    expect(buildFigure(response({ graph: null }), { showGeometry: true, compact: false }).data).toEqual([])
  })
})

describe('chooseYRange', () => {
  it('autoranges smooth curves', () => {
    const y = Array.from({ length: 100 }, (_, i) => Math.sin(i / 10))
    expect(chooseYRange(y, [])).toBeUndefined()
  })

  it('clips curves with asymptote spikes but keeps 0 and the nodes visible', () => {
    const y = Array.from({ length: 200 }, (_, i) => 1 + i / 200)
    y[100] = 1e9
    const range = chooseYRange(y, [5])
    expect(range).toBeDefined()
    expect(range![1]).toBeLessThan(100)
    expect(range![0]).toBeLessThanOrEqual(0)
    expect(range![1]).toBeGreaterThanOrEqual(5)
  })
})
