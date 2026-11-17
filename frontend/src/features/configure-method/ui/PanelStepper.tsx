import { useEffect, useState } from 'react'
import { PANEL_LIMITS } from '@/shared/config'
import { formatInteger } from '@/shared/lib/format'
import { clampPanels, useIntegral, useIntegralActions } from '@/entities/integral'
import { useSelectedMethod } from '../api/useMethods'
import styles from './configure.module.css'

/** Panel count stepper (composite only) plus the «r × n» elementary-subinterval hint. */
export function PanelStepper() {
  const { variant, panels, methodId } = useIntegral()
  const { setPanels } = useIntegralActions()
  const method = useSelectedMethod(methodId)
  const [draft, setDraft] = useState(String(panels))

  useEffect(() => setDraft(String(panels)), [panels])

  if (variant === 'simple') {
    return (
      <p className={styles.note}>La variante simple aplica la fórmula una sola vez sobre todo el intervalo (r = 1).</p>
    )
  }

  const commit = () => {
    const parsed = Number(draft)
    setPanels(clampPanels(parsed))
    setDraft(String(clampPanels(parsed)))
  }

  return (
    <div className={styles.group}>
      <label className={styles.label} htmlFor="cfg-panels">
        Cantidad de paneles <i className={styles.italic}>r</i>
      </label>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepButton}
          aria-label="Quitar un panel"
          disabled={panels <= PANEL_LIMITS.min}
          onClick={() => setPanels(panels - 1)}
        >
          −
        </button>
        <input
          id="cfg-panels"
          className={styles.stepValue}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          aria-describedby="cfg-panels-hint"
          onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
          }}
        />
        <button
          type="button"
          className={styles.stepButton}
          aria-label="Agregar un panel"
          disabled={panels >= PANEL_LIMITS.max}
          onClick={() => setPanels(panels + 1)}
        >
          +
        </button>
      </div>
      <p id="cfg-panels-hint" className={styles.hint}>
        Entre {PANEL_LIMITS.min} y {formatInteger(PANEL_LIMITS.max)} paneles.
        {method ? (
          <>
            {' '}
            Subintervalos elementales: {formatInteger(panels)} × {method.subintervals_per_panel} ={' '}
            {formatInteger(panels * method.subintervals_per_panel)}
          </>
        ) : null}
      </p>
    </div>
  )
}
