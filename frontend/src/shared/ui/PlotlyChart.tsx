import Plotly from 'plotly.js-basic-dist-min'
import type { Config, Data, Layout, PlotlyHTMLElement } from 'plotly.js'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

export interface PlotlyChartHandle {
  /** factor < 1 zooms in, > 1 zooms out (view-only: scales the visible axis ranges). */
  zoom: (factor: number) => void
  reset: () => void
}

interface PlotlyChartProps {
  data: Data[]
  layout: Partial<Layout>
  config?: Partial<Config>
  height: number
  ariaLabel: string
  ref?: Ref<PlotlyChartHandle>
}

const DEFAULT_CONFIG: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  displayModeBar: false,
  scrollZoom: true,
  doubleClick: 'reset',
}

interface FullLayout {
  xaxis?: { range?: [number, number] }
  yaxis?: { range?: [number, number] }
}

function scaleRange(range: [number, number], factor: number): [number, number] {
  const center = (range[0] + range[1]) / 2
  const half = ((range[1] - range[0]) / 2) * factor
  return [center - half, center + half]
}

/** Thin imperative wrapper around Plotly.react. Loaded lazily (see LazyPlotlyChart). */
export default function PlotlyChart({ data, layout, config, height, ariaLabel, ref }: PlotlyChartProps) {
  const container = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useImperativeHandle(
    ref,
    () => ({
      zoom(factor) {
        const el = container.current as PlotlyHTMLElement | null
        const full = (el as unknown as { _fullLayout?: FullLayout } | null)?._fullLayout
        if (!el || !full?.xaxis?.range || !full.yaxis?.range) return
        const [x0, x1] = scaleRange(full.xaxis.range, factor)
        const [y0, y1] = scaleRange(full.yaxis.range, factor)
        void Plotly.relayout(el, { 'xaxis.range': [x0, x1], 'yaxis.range': [y0, y1] } as unknown as Partial<Layout>)
      },
      reset() {
        const el = container.current
        if (!el) return
        const yRange = layoutRef.current.yaxis?.range
        const update = {
          'xaxis.autorange': true,
          ...(yRange ? { 'yaxis.range': yRange } : { 'yaxis.autorange': true }),
        }
        void Plotly.relayout(el, update as unknown as Partial<Layout>)
      },
    }),
    [],
  )

  useEffect(() => {
    const el = container.current
    if (!el) return
    void Plotly.react(el, data, { autosize: true, ...layout }, { ...DEFAULT_CONFIG, ...config })
  }, [data, layout, config])

  useEffect(() => {
    const el = container.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth > 0) void Plotly.Plots.resize(el)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      Plotly.purge(el)
    }
  }, [])

  return <div ref={container} role="img" aria-label={ariaLabel} style={{ width: '100%', height }} />
}
