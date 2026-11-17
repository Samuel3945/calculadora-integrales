import { isValidVariable } from '@/shared/lib/math-input'
import { useIntegral, useIntegralActions } from '@/entities/integral'
import { BoundInput } from './BoundInput'
import styles from './RangeFields.module.css'

/** Configuration-panel inputs: variable and both bounds (same store as the «Integral definida» card). */
export function RangeFields() {
  const { variable, lower, upper } = useIntegral()
  const { setVariable, setLower, setUpper } = useIntegralActions()
  const variableOk = isValidVariable(variable)

  return (
    <>
      <div className={styles.field}>
        <label htmlFor="cfg-var" className={styles.label}>
          Variable de integración
        </label>
        <input
          id="cfg-var"
          className={styles.variable}
          type="text"
          value={variable}
          maxLength={1}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!variableOk}
          aria-describedby={variableOk ? undefined : 'cfg-var-error'}
          onChange={(event) => setVariable(event.target.value)}
        />
        {variableOk ? null : (
          <p id="cfg-var-error" className={styles.error} role="alert">
            Usa una sola letra distinta de e.
          </p>
        )}
      </div>

      <div className={styles.bounds}>
        <div className={styles.field}>
          <label htmlFor="cfg-lower" className={styles.label}>
            Límite inferior <i className={styles.italic}>a</i>
          </label>
          <BoundInput id="cfg-lower" variant="field" value={lower} onChange={setLower} />
        </div>
        <div className={styles.field}>
          <label htmlFor="cfg-upper" className={styles.label}>
            Límite superior <i className={styles.italic}>b</i>
          </label>
          <BoundInput id="cfg-upper" variant="field" value={upper} onChange={setUpper} />
        </div>
      </div>
      <p className={styles.hint}>Acepta números, π, e y expresiones como π/2.</p>
    </>
  )
}
