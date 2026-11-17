import { useMemo, useRef } from 'react'
import { useIntegral, useIntegralActions } from '@/entities/integral'
import { Card, CheckIcon, AlertCircleIcon } from '@/shared/ui'
import { useExpressionValidation, type ExpressionStatus } from '../api/useExpressionValidation'
import { buildExamples, buildKeypad } from '../lib/keypad'
import { Keypad } from './Keypad'
import { MathField, type MathFieldHandle } from './MathField'
import styles from './ExpressionEditorCard.module.css'

function StatusBadge({ status }: { status: ExpressionStatus }) {
  switch (status.kind) {
    case 'valid':
      return (
        <span className={`${styles.badge} ${styles.ok}`} role="status">
          <CheckIcon />
          Expresión válida
        </span>
      )
    case 'checking':
      return (
        <span className={`${styles.badge} ${styles.neutral}`} role="status">
          Validando…
        </span>
      )
    case 'rejected':
    case 'invalid':
      return (
        <span className={`${styles.badge} ${styles.error}`} role="status">
          <AlertCircleIcon size={14} />
          Expresión no válida
        </span>
      )
    case 'unreachable':
      return (
        <span className={`${styles.badge} ${styles.warn}`} role="status">
          <AlertCircleIcon size={14} />
          No se pudo validar
        </span>
      )
  }
}

export function ExpressionEditorCard() {
  const { latex, variable } = useIntegral()
  const { setLatex } = useIntegralActions()
  const { status, canonical } = useExpressionValidation()
  const field = useRef<MathFieldHandle | null>(null)
  const keys = useMemo(() => buildKeypad(variable), [variable])
  const examples = useMemo(() => buildExamples(variable), [variable])

  const problem = status.kind === 'rejected' || status.kind === 'invalid' || status.kind === 'unreachable' ? status.message : null

  return (
    <Card title="Función a integrar" headingId="expr-title" aside={<StatusBadge status={status} />}>
      <div className={`${styles.editor} ${problem && status.kind !== 'unreachable' ? styles.editorError : ''}`}>
        <span className={styles.prefix} aria-hidden="true">
          <i>f</i>(<i>{variable}</i>) =
        </span>
        <MathField ref={field} value={latex} onChange={setLatex} ariaLabel={`Función f(${variable}) a integrar`} />
      </div>

      {problem ? (
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      ) : null}

      <div className={styles.meta}>
        <span>
          Formato enviado al servidor: <code className={styles.code}>{canonical ?? '—'}</code>
        </span>
        <span>
          <span className="mono">ln</span> y <span className="mono">log</span> son el logaritmo natural
        </span>
      </div>

      <Keypad keys={keys} onKey={(action) => field.current?.perform(action)} />

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Ejemplos:</span>
        {examples.map((example) => (
          <button key={example.id} type="button" className={styles.chip} onClick={() => setLatex(example.latex)}>
            {example.label}
          </button>
        ))}
      </div>
    </Card>
  )
}
