import { formatFixed } from '@/shared/lib/format'
import { useSolvedResult } from '@/entities/integral'
import { DefinedIntegralCard, ExpressionEditorCard } from '@/features/edit-integral'
import styles from './workspace.module.css'

/** «Función a integrar» + «Integral definida» cards (rendered as two sibling grid items). */
export function ExpressionWorkspace() {
  const { solved, isStale } = useSolvedResult()
  const approximation = solved ? (
    <span
      className={`${styles.approximation} ${isStale ? styles.stale : ''}`}
      title={isStale ? 'Resultado desactualizado: la configuración cambió' : undefined}
    >
      {formatFixed(solved.response.approximation)}
    </span>
  ) : undefined

  return (
    <>
      <ExpressionEditorCard />
      <DefinedIntegralCard approximation={approximation} />
    </>
  )
}
