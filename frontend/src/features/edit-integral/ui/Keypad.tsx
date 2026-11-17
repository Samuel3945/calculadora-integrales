import type { KeyAction, KeypadKey } from '../lib/keypad'
import styles from './Keypad.module.css'

interface KeypadProps {
  keys: KeypadKey[]
  onKey: (action: KeyAction) => void
}

export function Keypad({ keys, onKey }: KeypadProps) {
  return (
    <div className={styles.grid} role="group" aria-label="Teclado de funciones">
      {keys.map((key) => (
        <button
          key={key.id}
          type="button"
          className={`${styles.key} ${styles[key.kind]}`}
          aria-label={key.ariaLabel}
          // keep the caret/selection inside the math field when pressing a key
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onKey(key.action)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
