import type { ReactNode } from 'react'
import { useIntegral, useIntegralActions } from '@/entities/integral'
import { Card, KatexMath } from '@/shared/ui'
import { useExpressionValidation } from '../api/useExpressionValidation'
import { BoundInput } from './BoundInput'
import styles from './DefinedIntegralCard.module.css'

interface DefinedIntegralCardProps {
  /** Rendered after «≈» (the approximation of the last calculation, when there is one). */
  approximation?: ReactNode
}

export function DefinedIntegralCard({ approximation }: DefinedIntegralCardProps) {
  const { lower, upper, variable } = useIntegral()
  const { setLower, setUpper } = useIntegralActions()
  const { lastValidLatex } = useExpressionValidation()

  return (
    <Card title="Integral definida" headingId="integral-title" gap="sm">
      <div className={styles.formula}>
        <div className={styles.sign}>
          <span className={styles.integralSign} aria-hidden="true">
            ∫
          </span>
          <div className={styles.bounds}>
            <BoundInput variant="integral" value={upper} onChange={setUpper} ariaLabel="Límite superior b" />
            <BoundInput variant="integral" value={lower} onChange={setLower} ariaLabel="Límite inferior a" />
          </div>
        </div>
        <span className={styles.integrand}>
          {lastValidLatex ? (
            <KatexMath latex={`${lastValidLatex}\\,d${variable}`} fallback={`f(${variable}) d${variable}`} />
          ) : (
            <span className={styles.placeholder}>
              f(<i>{variable}</i>) d<i>{variable}</i>
            </span>
          )}
        </span>
        {approximation ? (
          <>
            <span className={styles.approx} aria-hidden="true">
              ≈
            </span>
            {approximation}
          </>
        ) : null}
      </div>
      <p className={styles.note}>
        Los límites se editan aquí o en la configuración: ambos campos muestran siempre el mismo valor.
      </p>
    </Card>
  )
}
