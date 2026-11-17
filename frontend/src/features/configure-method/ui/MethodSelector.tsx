import { METHOD_IDS_BY_FAMILY, useIntegral, useIntegralActions } from '@/entities/integral'
import { describeError } from '@/entities/integral'
import { Button, Spinner } from '@/shared/ui'
import { useMethods } from '../api/useMethods'
import styles from './configure.module.css'

export function MethodSelector() {
  const { family, methodId } = useIntegral()
  const { setMethod } = useIntegralActions()
  const { methods, query } = useMethods()

  const visibleIds = METHOD_IDS_BY_FAMILY[family]
  const visible = methods?.filter((m) => visibleIds.includes(m.id))

  return (
    <div className={styles.group}>
      <span className={styles.label}>Método</span>
      {query.isPending ? <Spinner label="Cargando métodos…" /> : null}
      {query.isError ? (
        <div className={styles.loadError} role="alert">
          <p>No se pudo cargar el catálogo de métodos. {describeError(query.error)}</p>
          <Button onClick={() => void query.refetch()}>Reintentar</Button>
        </div>
      ) : null}
      {visible?.map((method) => {
        const selected = method.id === methodId
        const sub = method.subintervals_per_panel
        return (
          <button
            key={method.id}
            type="button"
            className={styles.methodCard}
            aria-pressed={selected}
            onClick={() => setMethod(method.id)}
          >
            <span className={styles.methodTop}>
              <span className={styles.methodName}>{method.name}</span>
              <span className={styles.dot} aria-hidden="true" />
            </span>
            <span className={styles.methodMeta}>
              Grado {method.degree_of_exactness} · {sub} {sub === 1 ? 'subintervalo' : 'subintervalos'} por panel
            </span>
          </button>
        )
      })}
    </div>
  )
}
