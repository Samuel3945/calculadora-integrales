import { describeError, describeErrorCode, FAMILY_LABEL, getMethodCopy, VARIANT_LABEL, describeExactStatus } from '@/entities/integral'
import type { CompareResponse } from '@/entities/integral'
import { analyzeComparison, useCompareMethods } from '@/features/compare-methods'
import type { ComparisonAnalysis, ComparisonRow } from '@/features/compare-methods'
import { formatFixed, formatInteger, formatPercent, formatScientific, formatShort } from '@/shared/lib/format'
import { Alert, Badge, BulbIcon, Button, Card, KatexMath, Spinner } from '@/shared/ui'
import styles from './ComparisonView.module.css'

interface ComparisonViewProps {
  onEditIntegral: () => void
}

function ExactValue({ response }: { response: CompareResponse }) {
  const { exact } = response
  if (exact.status !== 'computed' || exact.value === null) return <>{describeExactStatus(exact.status)}</>
  return exact.latex ? <KatexMath latex={exact.latex} fallback={formatShort(exact.value)} /> : <>{formatShort(exact.value)}</>
}

function SummaryBar({
  response,
  onEditIntegral,
  onRecalculate,
  busy,
}: {
  response: CompareResponse
  onEditIntegral: () => void
  onRecalculate: () => void
  busy: boolean
}) {
  const { expression, bounds } = response
  const okCount = response.results.filter((r) => r.status === 'ok').length
  return (
    <section className={styles.summary} aria-label="Integral comparada">
      <div className={styles.integral}>
        <KatexMath
          latex={`\\int_{${bounds.lower_latex}}^{${bounds.upper_latex}} ${expression.latex}\\,d${expression.variable}`}
          fallback={`∫ ${expression.canonical} d${expression.variable}`}
        />
      </div>
      <div className={styles.pills}>
        <span className={styles.pill}>
          Variante: <strong>{VARIANT_LABEL[response.variant].toLowerCase()}</strong>
        </span>
        <span className={styles.pill}>
          Paneles: <strong className="mono">{formatInteger(response.panel_count)}</strong>
        </span>
        <span className={styles.pill}>
          Valor exacto:{' '}
          <strong className="mono">
            <ExactValue response={response} />
          </strong>
        </span>
        <span className={styles.pill}>
          Métodos:{' '}
          <strong>
            {okCount} de {response.results.length}
          </strong>
        </span>
      </div>
      <Button onClick={onEditIntegral}>Editar integral</Button>
      <Button variant="primary" onClick={onRecalculate} disabled={busy}>
        Recalcular comparación
      </Button>
    </section>
  )
}

function ResultsTable({ analysis }: { analysis: ComparisonAnalysis }) {
  const { exactAvailable } = analysis
  const errorSpan = exactAvailable ? 4 : 2
  return (
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Tabla comparativa, desplazable">
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.left}>Método</th>
            <th scope="col" className={styles.left}>Familia</th>
            <th scope="col">Aproximación</th>
            {exactAvailable ? (
              <>
                <th scope="col">Error absoluto</th>
                <th scope="col">Error relativo</th>
              </>
            ) : null}
            <th scope="col">Evaluaciones</th>
            <th scope="col">Grado</th>
          </tr>
        </thead>
        <tbody>
          {analysis.rows.map((row) => (
            <ResultRow key={row.result.method.id} row={row} exactAvailable={exactAvailable} errorSpan={errorSpan} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResultRow({ row, exactAvailable, errorSpan }: { row: ComparisonRow; exactAvailable: boolean; errorSpan: number }) {
  const { result } = row
  const copy = getMethodCopy(result.method.id)
  const nameCell = (
    <td className={`${styles.left} ${styles.name}`}>
      {copy.name}
      {row.isBest ? <Badge tone="ok">Más preciso</Badge> : null}
      {row.isCheapest ? <Badge tone="neutral">Menos evaluaciones</Badge> : null}
    </td>
  )
  const familyCell = <td className={`${styles.left} ${styles.muted}`}>{FAMILY_LABEL[result.method.family]}</td>

  if (result.status === 'error') {
    return (
      <tr>
        {nameCell}
        {familyCell}
        <td colSpan={errorSpan} className={`${styles.left} ${styles.rowError}`}>
          {result.error ? describeErrorCode(result.error.code, result.error.details) : describeErrorCode('UNKNOWN')}
        </td>
        <td>{result.method.degree_of_exactness}</td>
      </tr>
    )
  }

  return (
    <tr className={row.isBest ? styles.best : undefined}>
      {nameCell}
      {familyCell}
      <td>{formatFixed(result.approximation, 8)}</td>
      {exactAvailable ? (
        <>
          <td>{formatScientific(result.absolute_error, 3)}</td>
          <td>{result.relative_error === null ? '—' : formatPercent(result.relative_error)}</td>
        </>
      ) : null}
      <td>{result.function_evaluations === null ? '—' : formatInteger(result.function_evaluations)}</td>
      <td>{result.method.degree_of_exactness}</td>
    </tr>
  )
}

function DigitsPanel({ analysis }: { analysis: ComparisonAnalysis }) {
  const ticks = Array.from({ length: analysis.axisMax / 2 + 1 }, (_, i) => i * 2)
  return (
    <Card title="Dígitos correctos" headingId="digits-title" className={styles.digits} gap="md">
      <p className={styles.digitsNote}>−log₁₀(error relativo) · más largo es más preciso</p>
      <div className={styles.legend}>
        <span>
          <span className={`${styles.swatch} ${styles.closed}`} aria-hidden="true" />
          Cerrados
        </span>
        <span>
          <span className={`${styles.swatch} ${styles.open}`} aria-hidden="true" />
          Abiertos
        </span>
      </div>
      <ul className={styles.bars}>
        {analysis.rows.map((row) => {
          const copy = getMethodCopy(row.result.method.id)
          const digits = row.digits
          return (
            <li key={row.result.method.id}>
              <div className={styles.barHead}>
                <span>{copy.shortName}</span>
                <span className="mono">{digits === null ? '—' : digits.toFixed(2)}</span>
              </div>
              <div
                className={styles.track}
                role="meter"
                aria-label={`Dígitos correctos de ${copy.name}`}
                aria-valuemin={0}
                aria-valuemax={analysis.axisMax}
                aria-valuenow={digits ?? 0}
                aria-valuetext={digits === null ? 'No disponible' : `${digits.toFixed(2)} dígitos`}
              >
                <div
                  className={`${styles.fill} ${row.result.method.family === 'open' ? styles.open : styles.closed}`}
                  style={{ width: `${digits === null ? 0 : (digits / analysis.axisMax) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <div className={styles.ticks} aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </Card>
  )
}

function insightText(response: CompareResponse, analysis: ComparisonAnalysis): string | null {
  if (!analysis.exactAvailable) return null
  const best = analysis.rows.find((r) => r.isBest)
  if (!best) return null
  const cheapest = analysis.rows.find((r) => r.isCheapest)
  const r = response.panel_count
  const prefix =
    response.variant === 'simple' ? 'Con la variante simple' : `Con ${formatInteger(r)} ${r === 1 ? 'panel' : 'paneles'}`
  const describe = (row: ComparisonRow) => {
    const digits = row.digits ?? 0
    const reach = digits < 1 ? 'no llega a 1 dígito correcto' : `llega a unos ${Math.floor(digits)} dígitos correctos`
    return `${getMethodCopy(row.result.method.id).shortName} hace ${row.result.function_evaluations ?? '—'} evaluaciones y ${reach}`
  }
  const parts = [`${prefix}, ${describe(best)}`]
  if (cheapest && cheapest !== best) parts.push(describe(cheapest))
  return `${parts.join('; ')}.`
}

export function ComparisonView({ onEditIntegral }: ComparisonViewProps) {
  const { run, compared, isStale, isPending, error, blockedReason } = useCompareMethods({ auto: true })
  const response = compared?.response
  const analysis = response ? analyzeComparison(response) : null
  const insight = response && analysis ? insightText(response, analysis) : null

  return (
    <div className={styles.view}>
      {blockedReason ? (
        <Alert
          tone="info"
          actions={<Button onClick={onEditIntegral}>Editar integral</Button>}
        >
          No se puede comparar todavía: {blockedReason}
        </Alert>
      ) : null}

      {error && !isPending ? (
        <Alert tone="error" actions={<Button onClick={run}>Reintentar</Button>}>
          {describeError(error)}
        </Alert>
      ) : null}

      {isPending ? (
        <Card label="Calculando comparación">
          <Spinner label="Comparando los métodos…" />
        </Card>
      ) : null}

      {response && analysis ? (
        <div className={isPending ? styles.dimmed : undefined}>
          <SummaryBar response={response} onEditIntegral={onEditIntegral} onRecalculate={run} busy={isPending || blockedReason !== null} />

          {isStale && !isPending ? (
            <Alert tone="warning">La integral cambió. Pulsa «Recalcular comparación» para actualizar la tabla.</Alert>
          ) : null}

          {response.warnings.length > 0 && !analysis.exactAvailable ? (
            <Alert tone="info">
              No hay valor exacto disponible para esta integral, así que no se pueden calcular los errores ni los dígitos
              correctos. Se muestran las aproximaciones y el número de evaluaciones.
            </Alert>
          ) : !analysis.exactAvailable ? (
            <Alert tone="info">
              {response.exact.status === 'disabled'
                ? 'El cálculo del valor exacto está desactivado, así que no se muestran errores ni dígitos correctos. Actívalo en las opciones de la calculadora.'
                : 'No hay valor exacto disponible para esta integral, así que no se pueden calcular los errores ni los dígitos correctos.'}
            </Alert>
          ) : null}

          <div className={styles.columns}>
            <Card
              title="Resultados por método"
              headingId="compare-table-title"
              className={styles.tableCard}
              aside={<span className={styles.hintRight}>Mismos paneles para todos · distinto número de evaluaciones</span>}
            >
              <ResultsTable analysis={analysis} />
              <p className={styles.footnote}>
                Los métodos cerrados comparten el nodo entre paneles vecinos, por eso usan r·n + 1 evaluaciones; los
                abiertos usan r × (nodos por panel).
              </p>
            </Card>
            {analysis.exactAvailable ? <DigitsPanel analysis={analysis} /> : null}
          </div>

          {insight ? (
            <div className={styles.insight}>
              <BulbIcon className={styles.bulb} />
              <p>{insight}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
