import type { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  title?: ReactNode
  headingId?: string
  /** Content aligned to the right of the title (badge, subtitle, buttons). */
  aside?: ReactNode
  children: ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg'
  label?: string
}

export function Card({ title, headingId, aside, children, className, gap = 'md', label }: CardProps) {
  const classes = [styles.card, styles[gap], className].filter(Boolean).join(' ')
  return (
    <section className={classes} aria-labelledby={title && headingId ? headingId : undefined} aria-label={label}>
      {title || aside ? (
        <div className={styles.header}>
          {title ? (
            <h2 id={headingId} className={styles.title}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className={styles.eyebrow}>{children}</div>
}
