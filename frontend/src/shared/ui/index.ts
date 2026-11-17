export { Alert } from './Alert'
export { Badge } from './Badge'
export { Button } from './Button'
export { Card, Eyebrow } from './Card'
export * from './icons'
export { KatexMath } from './KatexMath'
export { Segmented } from './Segmented'
export { Spinner } from './Spinner'
import { lazy } from 'react'

export type { PlotlyChartHandle } from './PlotlyChart'
/** Plotly is ~1 MB: it is only fetched when a chart is first rendered. */
export const LazyPlotlyChart = lazy(() => import('./PlotlyChart'))
