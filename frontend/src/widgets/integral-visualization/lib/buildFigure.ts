import type { Data, Layout, Shape, Annotations } from 'plotly.js'
import type { SolveResponse } from '@/entities/integral'
import { formatCell, formatShort } from '@/shared/lib/format'

/**
 * Pure mapping API response -> Plotly figure. Arrays are used as received (no numerical work);
 * the only derived values are display choices (ranges, labels, hover text).
 */

export const COLORS = {
  curve: '#1D4ED8',
  area: 'rgba(29, 78, 216, 0.16)',
  node: '#C2410C',
  ink: '#0F172A',
  muted: '#475569',
  grid: '#E2E8F0',
  axis: '#94A3B8',
} as const

export const MAX_PANEL_DIVIDERS = 60
export const MAX_PANEL_LABELS = 8

export interface Figure {
  data: Data[]
  layout: Partial<Layout>
  hasApproximation: boolean
  hasSharedNodes: boolean
}

function quantile(sorted: number[], q: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[index] as number
}

/**
 * Keeps vertical asymptotes from flattening the plot: when the curve has extreme outliers the view is
 * clipped to the bulk of the data (always including 0 and every node). Returns undefined to autorange.
 */
export function chooseYRange(curveY: Array<number | null>, nodeY: Array<number | null>): [number, number] | undefined {
  const finite = curveY.filter((v): v is number => v !== null && Number.isFinite(v))
  if (finite.length < 10) return undefined
  const sorted = [...finite].sort((a, b) => a - b)
  const lo = quantile(sorted, 0.02)
  const hi = quantile(sorted, 0.98)
  const min = sorted[0] as number
  const max = sorted[sorted.length - 1] as number
  const bulk = hi - lo
  if (bulk === 0 ? max - min === 0 : max - min <= 6 * bulk) return undefined

  const anchors = [0, ...nodeY.filter((v): v is number => v !== null && Number.isFinite(v))]
  const rangeLo = Math.min(lo, ...anchors)
  const rangeHi = Math.max(hi, ...anchors)
  const pad = (rangeHi - rangeLo || 1) * 0.1
  return [rangeLo - pad, rangeHi + pad]
}

export function buildFigure(response: SolveResponse, options: { showGeometry: boolean; compact: boolean }): Figure {
  const graph = response.graph
  const data: Data[] = []
  if (!graph) {
    return { data, layout: {}, hasApproximation: false, hasSharedNodes: false }
  }

  // Panel/weight info per node, from the evaluations table (hover only).
  const nodeInfo = new Map<number, { panels: number[]; weights: number[] }>()
  let hasSharedNodes = false
  for (const row of response.evaluations) {
    if (row.shared) hasSharedNodes = true
    const info = nodeInfo.get(row.x)
    if (info) {
      info.panels.push(row.panel)
      info.weights.push(row.weight)
    } else {
      nodeInfo.set(row.x, { panels: [row.panel], weights: [row.weight] })
    }
  }

  data.push({
    type: 'scatter',
    mode: 'lines',
    name: 'Área de integración',
    x: graph.area.x,
    y: graph.area.y,
    fill: 'tozeroy',
    fillcolor: COLORS.area,
    line: { width: 0, color: COLORS.curve },
    connectgaps: false,
    hoverinfo: 'skip',
  })

  data.push({
    type: 'scatter',
    mode: 'lines',
    name: 'f(x)',
    x: graph.curve.x,
    y: graph.curve.y,
    line: { color: COLORS.curve, width: options.compact ? 3 : 2.25 },
    connectgaps: false,
    hovertemplate: 'x = %{x:.6g}<br>f(x) = %{y:.6g}<extra></extra>',
  })

  const curves = graph.approximation_curves
  const hasApproximation = curves.length > 0
  if (options.showGeometry && hasApproximation) {
    // One trace for every panel: null separators keep the panels visually independent.
    const x: Array<number | null> = []
    const y: Array<number | null> = []
    curves.forEach((curve, i) => {
      if (i > 0) {
        x.push(null)
        y.push(null)
      }
      x.push(...curve.x)
      y.push(...curve.y)
    })
    data.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Aproximación geométrica',
      x,
      y,
      line: { color: COLORS.node, width: 1.75, dash: 'dash' },
      connectgaps: false,
      hoverinfo: 'skip',
    })
  }

  if (graph.nodes.x.length > 0) {
    const customdata = graph.nodes.x.map((x) => {
      const info = nodeInfo.get(x)
      return [info ? info.panels.join(' y ') : '—', info ? info.weights.map(formatCell).join(' y ') : '—']
    })
    data.push({
      type: 'scatter',
      mode: 'markers',
      name: 'Nodos evaluados',
      x: graph.nodes.x,
      y: graph.nodes.y,
      customdata,
      marker: { color: COLORS.node, size: options.compact ? 13 : 10, line: { color: '#FFFFFF', width: 2 } },
      hovertemplate:
        '<b>Nodo · panel %{customdata[0]}</b><br>x = %{x:.6g}<br>f(x) = %{y:.6g}<br>peso = %{customdata[1]}<extra></extra>',
    })
  }

  const { lower, upper } = response.bounds
  const shapes: Partial<Shape>[] = [lower, upper].map((x) => ({
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    line: { color: COLORS.ink, width: 1.25 },
  }))

  if (response.panels.length <= MAX_PANEL_DIVIDERS) {
    response.panels.slice(0, -1).forEach((panel) => {
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: panel.end,
        x1: panel.end,
        y0: 0,
        y1: 1,
        line: { color: COLORS.axis, width: 1, dash: 'dash' },
      })
    })
  }

  const annotations: Partial<Annotations>[] = [
    {
      x: lower,
      y: 1,
      xref: 'x',
      yref: 'paper',
      text: `a = ${formatShort(lower)}`,
      showarrow: false,
      xanchor: lower <= upper ? 'left' : 'right',
      yanchor: 'bottom',
      font: { family: 'JetBrains Mono, monospace', size: 11, color: COLORS.ink },
    },
    {
      x: upper,
      y: 1,
      xref: 'x',
      yref: 'paper',
      text: `b = ${formatShort(upper)}`,
      showarrow: false,
      xanchor: lower <= upper ? 'right' : 'left',
      yanchor: 'bottom',
      font: { family: 'JetBrains Mono, monospace', size: 11, color: COLORS.ink },
    },
  ]

  if (response.panels.length > 1 && response.panels.length <= MAX_PANEL_LABELS) {
    response.panels.forEach((panel) => {
      annotations.push({
        x: (panel.start + panel.end) / 2,
        y: 0,
        xref: 'x',
        yref: 'paper',
        text: `Panel ${panel.index}`,
        showarrow: false,
        yanchor: 'bottom',
        font: { family: 'JetBrains Mono, monospace', size: 11, color: COLORS.muted },
      })
    })
  }

  const yRange = chooseYRange(graph.curve.y, graph.nodes.y)
  const axisCommon = {
    gridcolor: COLORS.grid,
    zeroline: true,
    zerolinecolor: COLORS.axis,
    zerolinewidth: 1.25,
    linecolor: COLORS.axis,
    tickfont: { family: 'JetBrains Mono, monospace', size: options.compact ? 10 : 11, color: COLORS.muted },
    automargin: true,
  }

  const layout: Partial<Layout> = {
    margin: { l: 48, r: 16, t: 28, b: 32 },
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF',
    showlegend: false,
    hovermode: 'closest',
    dragmode: 'pan',
    uirevision: `${response.expression.canonical}|${lower}|${upper}|${response.method.id}|${response.panel_count}`,
    hoverlabel: {
      bgcolor: COLORS.ink,
      bordercolor: COLORS.ink,
      font: { family: 'JetBrains Mono, monospace', size: 12, color: '#FFFFFF' },
    },
    xaxis: { ...axisCommon },
    yaxis: yRange ? { ...axisCommon, range: yRange, autorange: false } : { ...axisCommon },
    shapes,
    annotations,
  }

  return { data, layout, hasApproximation, hasSharedNodes }
}
