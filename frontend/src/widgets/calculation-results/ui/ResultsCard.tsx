import type { ReactNode } from 'react'
import { useSolvedResult, describeExactStatus, describeWarning, getMethodCopy, VARIANT_LABEL } from '@/entities/integral'
import type { SolveResponse } from '@/entities/integral'
import { formatCell, formatFixed, formatInteger, formatPercent, formatScientific, formatShort } from '@/shared/lib/format'
import { Alert, Card, KatexMath } from '@/shared/ui'
import { SolveNotices, useSolveStatus } from '@/features/solve-integral'
import styles from './ResultsCard.module.css'

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>{value}</div>
      <div className={styles.tileHint}>{hint}</div>
    </div>
  )
}

const EXACT_HINTS = {
  disabled: 'Activa «Calcular valor exacto» en las opciones.',
  unavailable: 'No se encontró una solución exacta.',
  timeout: 'El cálculo simbólico superó el tiempo límite.',
} as const

function ExactTile({ response }: { response: SolveResponse }) {
  const { exact } = response
  if (exact.status !== 'computed' || exact.value === null) {
    return (
      <Tile
        label="Valor exacto"
        value={<span className={styles.unavailable}>{describeExactStatus(exact.status)}</span>}
        hint={EXACT_HINTS[exact.status === 'computed' ? 'unavailable' : exact.status]}
      />
    )
  }
  return (
    <Tile
      label="Valor exacto"
      value={exact.latex ? <KatexMath latex={exact.latex} fallback={formatShort(exact.value)} /> : formatShort(exact.value)}
      hint={`≈ ${formatFixed(exact.value)} · ${describeExactStatus('computed')}`}
    />
  )
}

function Metrics({ response }: { response: SolveResponse }) {
  const exactKnown = response.exact.status === 'computed'
  const estimate = response.estimated_error
  const estimateFailed = response.warnings.some((w) => w.code === 'ESTIMATE_UNAVAILABLE')

  return (
    <div className={styles.tiles}>
      <ExactTile response={response} />
      <Tile
        label="Error absoluto"
        value={exactKnown ? formatScientific(response.absolute_error, 4) : <span className={styles.unavailable}>No disponible</span>}
        hint="|I exacta − I aprox.|"
      />
      <Tile
        label="Error relativo"
        value={
          response.relative_error !== null ? (
            formatPercent(response.relative_error)
          ) : (
            <span className={styles.unavailable}>{exactKnown ? 'No definido' : 'No disponible'}</span>
          )
        }
        hint={exactKnown && response.relative_error === null ? 'El valor exacto es 0.' : 'Error absoluto / |I exacta|'}
      />
      <Tile
        label="Error estimado"
        value={
          estimate ? (
            `≈ ${formatScientific(Math.abs(estimate.value), 2)}`
          ) : (
            <span className={styles.unavailable}>{estimateFailed ? 'No disponible' : 'Desactivado'}</span>
          )
        }
        hint={estimate ? `Richardson: r vs ${formatInteger(estimate.refined_panel_count)} paneles` : 'Richardson: r vs 2r paneles'}
      />
    </div>
  )
}

function Summary({ response }: { response: SolveResponse }) {
  const copy = getMethodCopy(response.method.id)
  return (
    <>
      <div>
        <div className={styles.eyebrow}>Aproximación numérica</div>
        <div className={styles.approx}>{formatFixed(response.approximation)}</div>
      </div>
      <Metrics response={response} />
      <dl className={styles.meta}>
        <div>
          <dt>Método</dt>
          <dd>{copy.name}</dd>
        </div>
        <div>
          <dt>Variante</dt>
          <dd>{VARIANT_LABEL[response.variant]}</dd>
        </div>
        <div>
          <dt>Paneles (r)</dt>
          <dd className="mono">{formatInteger(response.panel_count)}</dd>
        </div>
        <div>
          <dt>Subintervalos</dt>
          <dd className="mono">{formatInteger(response.subinterval_count)}</dd>
        </div>
        <div>
          <dt>Paso interno h</dt>
          <dd className="mono">{formatCell(response.step)}</dd>
        </div>
        <div>
          <dt>Evaluaciones de f</dt>
          <dd className="mono">{formatInteger(response.function_evaluations)}</dd>
        </div>
      </dl>
      {response.warnings.length > 0 ? (
        <ul className={styles.warnings} aria-label="Avisos del cálculo">
          {response.warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>
              <Alert tone="warning">{describeWarning(warning)}</Alert>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

export function ResultsCard() {
  const { solved } = useSolvedResult()
  const { isPending, error } = useSolveStatus()
  const response = solved?.response

  const subtitle = response
    ? `${getMethodCopy(response.method.id).name} · ${VARIANT_LABEL[response.variant].toLowerCase()}${
        response.variant === 'composite' ? ` · ${formatInteger(response.panel_count)} paneles` : ''
      }`
    : undefined

  return (
    <Card
      title="Resultado"
      headingId="result-title"
      aside={subtitle ? <span className={styles.subtitle}>{subtitle}</span> : undefined}
    >
      <SolveNotices />
      {response ? (
        <Summary response={response} />
      ) : !isPending && !error ? (
        <p className={styles.empty}>Define la función y los límites, elige un método y pulsa «Calcular integral».</p>
      ) : null}
    </Card>
  )
}
