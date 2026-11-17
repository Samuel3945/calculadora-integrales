import { useEffect, useMemo, useState } from 'react'
import { useSolvedResult } from '@/entities/integral'
import type { SolveResponse } from '@/entities/integral'
import { useMethods } from '@/features/configure-method'
import { formatCell, formatFixed, formatInteger, formatShort } from '@/shared/lib/format'
import { Badge, Card, KatexMath, Segmented } from '@/shared/ui'
import { groupByPanel } from '../lib/groupPanels'
import styles from './ProcedureCard.module.css'

type Tab = 'evaluations' | 'steps'

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'evaluations', label: 'Tabla de evaluaciones' },
  { value: 'steps', label: 'Fórmulas paso a paso' },
]

const ROW_PAGE = 200
const PANEL_PAGE = 12

const paren = (latex: string) => (latex.startsWith('-') ? `(${latex})` : latex)

function PanelSums({ response, limit }: { response: SolveResponse; limit: number }) {
  const shown = response.panels.slice(0, limit)
  return (
    <div className={styles.sums}>
      {shown.map((panel) => (
        <span key={panel.index} className={styles.sumItem}>
          Panel {panel.index}: <strong>{formatFixed(panel.approximation)}</strong>
        </span>
      ))}
      {response.panels.length > shown.length ? (
        <span className={styles.sumItem}>… y {formatInteger(response.panels.length - shown.length)} paneles más</span>
      ) : null}
      <span className={styles.sumItem}>
        Suma total: <strong className={styles.total}>{formatFixed(response.approximation)}</strong>
      </span>
    </div>
  )
}

function EvaluationsTable({ response }: { response: SolveResponse }) {
  const [visible, setVisible] = useState(ROW_PAGE)
  const rows = response.evaluations
  const shown = rows.slice(0, visible)
  return (
    <>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Tabla de evaluaciones, desplazable">
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.left}>#</th>
              <th scope="col" className={styles.left}>Panel</th>
              <th scope="col">x</th>
              <th scope="col">f(x)</th>
              <th scope="col">Peso</th>
              <th scope="col">Contribución</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={`${row.index}-${row.panel}`}>
                <td className={styles.left}>{row.index}</td>
                <td className={`${styles.left} ${styles.ui}`}>
                  {row.panel}
                  {row.shared ? <Badge tone="shared">compartido</Badge> : null}
                </td>
                <td>{formatCell(row.x)}</td>
                <td>{formatCell(row.fx)}</td>
                <td>{formatCell(row.weight)}</td>
                <td className={styles.strong}>{formatCell(row.contribution)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length ? (
        <div className={styles.more}>
          <span>
            Mostrando {formatInteger(shown.length)} de {formatInteger(rows.length)} evaluaciones.
          </span>
          <button type="button" className={styles.link} onClick={() => setVisible((n) => n + ROW_PAGE)}>
            Mostrar {formatInteger(Math.min(ROW_PAGE, rows.length - shown.length))} más
          </button>
        </div>
      ) : null}
      <PanelSums response={response} limit={PANEL_PAGE} />
    </>
  )
}

function Steps({ response }: { response: SolveResponse }) {
  const { methods } = useMethods()
  const method = methods?.find((m) => m.id === response.method.id)
  const [limit, setLimit] = useState(PANEL_PAGE)
  const details = useMemo(() => groupByPanel(response.panels, response.evaluations), [response])
  const { bounds, panel_count: r } = response
  const n = response.method.subintervals_per_panel

  return (
    <ol className={styles.steps}>
      <li>
        Ancho de cada panel:{' '}
        <KatexMath
          latex={`W=\\frac{b-a}{r}=\\frac{${paren(bounds.upper_latex)}-${paren(bounds.lower_latex)}}{${r}}=${formatShort(response.panel_width)}`}
        />
      </li>
      <li>
        Paso interno ({n} {n === 1 ? 'subintervalo' : 'subintervalos'} por panel):{' '}
        <KatexMath latex={`h=\\frac{W}{${n}}=${formatShort(response.step)}`} />
      </li>
      {method ? (
        <li>
          En cada panel: <KatexMath latex={`I_i\\approx ${method.formula_latex}`} fallback={method.formula_latex} />
        </li>
      ) : null}
      {details.slice(0, limit).map(({ panel, rows }) => (
        <li key={panel.index}>
          Panel {panel.index}, [{formatShort(panel.start)}, {formatShort(panel.end)}]:{' '}
          <span className={styles.expr}>
            {rows.length > 0
              ? `${rows.map((row) => `${formatCell(row.weight)}·${formatCell(row.fx)}`).join(' + ')} = `
              : ''}
            {formatFixed(panel.approximation)}
          </span>
        </li>
      ))}
      {details.length > limit ? (
        <li>
          <button type="button" className={styles.link} onClick={() => setLimit((v) => v + PANEL_PAGE)}>
            Mostrar {formatInteger(Math.min(PANEL_PAGE, details.length - limit))} paneles más (faltan{' '}
            {formatInteger(details.length - limit)})
          </button>
        </li>
      ) : null}
      <li>
        Suma de los paneles: <strong className={styles.total}>I ≈ {formatFixed(response.approximation)}</strong>
      </li>
    </ol>
  )
}

export function ProcedureCard() {
  const { solved } = useSolvedResult()
  const [tab, setTab] = useState<Tab>('evaluations')
  const response = solved?.response
  const key = solved?.key

  // «Mostrar más» counters live inside the children; remounting them per result resets the counters.
  const [revision, setRevision] = useState(0)
  useEffect(() => setRevision((v) => v + 1), [key])

  return (
    <Card
      title="Procedimiento numérico"
      headingId="procedure-title"
      gap="md"
      aside={<Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Vista del procedimiento" size="sm" />}
    >
      {!response ? (
        <p className={styles.empty}>Calcula una integral para ver la tabla de evaluaciones y las fórmulas paso a paso.</p>
      ) : response.evaluations.length === 0 ? (
        <p className={styles.empty}>No hay evaluaciones: los límites son iguales y la integral vale 0.</p>
      ) : tab === 'evaluations' ? (
        <EvaluationsTable key={revision} response={response} />
      ) : (
        <Steps key={revision} response={response} />
      )}
    </Card>
  )
}
