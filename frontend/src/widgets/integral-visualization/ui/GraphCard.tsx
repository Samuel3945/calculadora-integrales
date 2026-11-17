import { Suspense, useMemo, useRef } from 'react'
import { useIntegral, useSolvedResult } from '@/entities/integral'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { Card, LazyPlotlyChart, ResetIcon, Spinner, ZoomInIcon, ZoomOutIcon } from '@/shared/ui'
import type { PlotlyChartHandle } from '@/shared/ui'
import { formatShort } from '@/shared/lib/format'
import { buildFigure } from '../lib/buildFigure'
import styles from './GraphCard.module.css'

export function GraphCard() {
  const { solved } = useSolvedResult()
  const { options } = useIntegral()
  const compact = useMediaQuery('(max-width: 640px)')
  const chart = useRef<PlotlyChartHandle | null>(null)
  const response = solved?.response

  const figure = useMemo(
    () => (response ? buildFigure(response, { showGeometry: options.showGeometry, compact }) : null),
    [response, options.showGeometry, compact],
  )

  const hasChart = figure !== null && figure.data.length > 0 && response !== undefined
  const ariaLabel = response
    ? `Gráfica de ${response.expression.canonical} entre ${formatShort(response.bounds.lower)} y ${formatShort(response.bounds.upper)}: área sombreada, ${response.graph?.nodes.x.length ?? 0} nodos evaluados`
    : 'Gráfica'

  const controls = hasChart ? (
    <div className={styles.controls}>
      <button type="button" className={styles.iconButton} aria-label="Acercar" onClick={() => chart.current?.zoom(0.6)}>
        <ZoomInIcon />
      </button>
      <button type="button" className={styles.iconButton} aria-label="Alejar" onClick={() => chart.current?.zoom(1.6)}>
        <ZoomOutIcon />
      </button>
      <button type="button" className={styles.iconButton} aria-label="Restablecer vista" onClick={() => chart.current?.reset()}>
        <ResetIcon />
      </button>
    </div>
  ) : undefined

  return (
    <Card title="Gráfica" headingId="graph-title" gap="sm" aside={controls}>
      <ul className={styles.legend} aria-label="Leyenda de la gráfica">
        <li>
          <span className={styles.swatchLine} aria-hidden="true" />f(x)
        </li>
        <li>
          <span className={styles.swatchArea} aria-hidden="true" />Área de integración
        </li>
        <li>
          <span className={styles.swatchNode} aria-hidden="true" />
          {compact ? 'Nodos' : 'Nodos evaluados por el método'}
        </li>
        {options.showGeometry ? (
          <li>
            <span className={styles.swatchDash} aria-hidden="true" />
            {compact ? 'Aproximación' : 'Aproximación geométrica por panel'}
          </li>
        ) : null}
      </ul>

      {hasChart && figure ? (
        <Suspense
          fallback={
            <div className={styles.placeholder} style={{ height: compact ? 300 : 380 }}>
              <Spinner label="Cargando gráfica…" />
            </div>
          }
        >
          <LazyPlotlyChart
            ref={chart}
            data={figure.data}
            layout={figure.layout}
            height={compact ? 300 : 380}
            ariaLabel={ariaLabel}
          />
        </Suspense>
      ) : (
        <div className={styles.placeholder} style={{ height: compact ? 220 : 280 }}>
          <p>La gráfica aparecerá después de calcular la integral.</p>
        </div>
      )}

      <p className={styles.note}>
        {hasChart && figure?.hasSharedNodes
          ? 'Los nodos compartidos entre paneles vecinos se evalúan una sola vez y aportan a ambos paneles.'
          : 'Los métodos abiertos solo evalúan nodos interiores de cada panel: nunca los extremos.'}{' '}
        {compact ? 'Toca un nodo para ver x, f(x) y su peso. Pellizca para hacer zoom.' : 'Pasa el cursor sobre un nodo para ver x, f(x), su panel y su peso.'}
      </p>
    </Card>
  )
}
