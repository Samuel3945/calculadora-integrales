import { Button, Spinner } from '@/shared/ui'
import { useSolveIntegral } from '../api/useSolveIntegral'
import styles from './solve.module.css'

export function SolveButton() {
  const { solve, isPending, blockedReason } = useSolveIntegral()
  return (
    <>
      <Button variant="primary" size="lg" onClick={solve} disabled={isPending || blockedReason !== null}>
        {isPending ? <Spinner label="Calculando…" /> : 'Calcular integral'}
      </Button>
      {blockedReason ? (
        <p className={styles.blocked} role="status">
          No se puede calcular todavía: {blockedReason}
        </p>
      ) : null}
    </>
  )
}
