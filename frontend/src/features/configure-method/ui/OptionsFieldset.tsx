import { useEffect, useState } from 'react'
import { GRAPH_POINT_LIMITS } from '@/shared/config'
import { clampGraphPoints, useIntegral, useIntegralActions } from '@/entities/integral'
import styles from './configure.module.css'

export function OptionsFieldset() {
  const { options } = useIntegral()
  const { setOptions } = useIntegralActions()
  const [draft, setDraft] = useState(String(options.graphPoints))

  useEffect(() => setDraft(String(options.graphPoints)), [options.graphPoints])

  const commit = () => {
    const next = clampGraphPoints(Number(draft))
    setOptions({ graphPoints: next })
    setDraft(String(next))
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Opciones</legend>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={options.calculateExact}
          onChange={(event) => setOptions({ calculateExact: event.target.checked })}
        />
        Calcular valor exacto (simbólico)
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={options.estimateError}
          onChange={(event) => setOptions({ estimateError: event.target.checked })}
        />
        Estimar el error (Richardson)
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={options.showGeometry}
          onChange={(event) => setOptions({ showGeometry: event.target.checked })}
        />
        Mostrar aproximación geométrica
      </label>
      <div className={styles.pointsRow}>
        <label htmlFor="cfg-points">Puntos de la gráfica</label>
        <input
          id="cfg-points"
          className={styles.points}
          type="number"
          inputMode="numeric"
          min={GRAPH_POINT_LIMITS.min}
          max={GRAPH_POINT_LIMITS.max}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
          }}
        />
      </div>
    </fieldset>
  )
}
