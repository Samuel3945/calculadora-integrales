import styles from './Segmented.module.css'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<Option<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  size?: 'md' | 'sm'
}

/** Toggle group: real buttons with aria-pressed (not a radiogroup) like the approved design. */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`${styles.group} ${styles[size]}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.button}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
