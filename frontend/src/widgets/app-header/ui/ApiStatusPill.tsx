import { useApiHealth } from '../api/useApiHealth'
import styles from './AppHeader.module.css'

export function ApiStatusPill() {
  const { isError, isSuccess } = useApiHealth()
  const state = isSuccess ? 'online' : isError ? 'offline' : 'checking'
  const label = state === 'online' ? 'API conectada' : state === 'offline' ? 'API sin conexión' : 'Comprobando API'
  return (
    <div className={`${styles.pill} ${styles[state]}`} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.pillText}>{label}</span>
    </div>
  )
}
