import { normalizeBound } from '@/shared/lib/math-input'
import styles from './BoundInput.module.css'

interface BoundInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  variant: 'integral' | 'field'
}

/** Text input for an integration bound (numbers or constant expressions such as π/2). */
export function BoundInput({ id, value, onChange, ariaLabel, variant }: BoundInputProps) {
  const invalid = !normalizeBound(value).ok
  return (
    <input
      id={id}
      className={`${styles.input} ${styles[variant]}`}
      type="text"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
      value={value}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
