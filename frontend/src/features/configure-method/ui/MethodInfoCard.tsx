import { formatErrorOrder } from '@/shared/lib/format'
import { Card, Eyebrow, KatexMath } from '@/shared/ui'
import { useIntegral } from '@/entities/integral'
import { useSelectedMethod } from '../api/useMethods'
import styles from './MethodInfoCard.module.css'

export function MethodInfoCard() {
  const { methodId } = useIntegral()
  const method = useSelectedMethod(methodId)

  return (
    <Card label="Sobre el método" gap="sm">
      <Eyebrow>Sobre el método</Eyebrow>
      {method ? (
        <>
          <h3 className={styles.name}>{method.name}</h3>
          <div className={styles.formula}>
            <KatexMath latex={`I \\approx ${method.formula_latex}`} fallback={method.formula_latex} />
          </div>
          <p className={styles.description}>{method.description}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Grado de exactitud</dt>
              <dd>{method.degree_of_exactness}</dd>
            </div>
            <div>
              <dt>Error compuesto</dt>
              <dd className={styles.order}>{formatErrorOrder(method.error_order)}</dd>
            </div>
            <div>
              <dt>Nodos por panel</dt>
              <dd>{method.nodes_per_panel}</dd>
            </div>
            <div>
              <dt>Subintervalos por panel</dt>
              <dd>{method.subintervals_per_panel}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className={styles.description}>La información del método aparecerá cuando el catálogo esté disponible.</p>
      )}
    </Card>
  )
}
