import { describeError, useSolvedResult } from '@/entities/integral'
import { Alert, Spinner } from '@/shared/ui'
import { useSolveStatus } from '../api/useSolveIntegral'
import styles from './solve.module.css'

/** Loading, error and «configuration changed» notices for the result card. */
export function SolveNotices() {
  const { solved, isStale } = useSolvedResult()
  const { isPending, error } = useSolveStatus()

  return (
    <>
      {isPending ? (
        <div className={styles.pending}>
          <Spinner label="Calculando la integral…" />
        </div>
      ) : null}
      {error && !isPending ? <Alert tone="error">{describeError(error)}</Alert> : null}
      {solved && isStale && !isPending ? (
        <Alert tone="warning">La configuración cambió. Pulsa «Calcular integral» para actualizar el resultado.</Alert>
      ) : null}
    </>
  )
}
