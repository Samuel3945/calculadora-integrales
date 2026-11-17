import type { ReactNode } from 'react'
import { AlertCircleIcon } from './icons'
import styles from './Alert.module.css'

interface AlertProps {
  tone: 'warning' | 'error' | 'info'
  children: ReactNode
  /** `alert` interrupts screen readers; use only for failures. */
  role?: 'status' | 'alert'
  actions?: ReactNode
}

export function Alert({ tone, children, role = tone === 'error' ? 'alert' : 'status', actions }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={role}>
      <AlertCircleIcon className={styles.icon} />
      <div className={styles.body}>{children}</div>
      {actions}
    </div>
  )
}
