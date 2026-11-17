import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import type { MathfieldElement } from 'mathlive'
import type { KeyAction } from '../lib/keypad'
import styles from './MathField.module.css'

export interface MathFieldHandle {
  perform: (action: KeyAction) => void
}

interface MathFieldProps {
  value: string
  onChange: (latex: string) => void
  ariaLabel: string
  ref?: Ref<MathFieldHandle>
}

/**
 * MathLive editor. MathLive (≈700 KB) is imported dynamically so first paint is not blocked.
 * The built-in virtual keyboard is disabled (policy "manual", no toggle): the app ships its own keypad.
 * If MathLive cannot load, a plain LaTeX input keeps the app usable (the value still goes through the
 * same whitelisted converter).
 */
export function MathField({ value, onChange, ariaLabel, ref }: MathFieldProps) {
  const host = useRef<HTMLDivElement | null>(null)
  const field = useRef<MathfieldElement | null>(null)
  const latest = useRef({ value, onChange })
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    latest.current = { value, onChange }
  })

  useImperativeHandle(
    ref,
    () => ({
      perform(action) {
        const mf = field.current
        if (!mf) return
        mf.focus()
        switch (action.type) {
          case 'insert':
            mf.insert(action.latex, { format: 'latex', focus: true, scrollIntoView: true })
            break
          case 'typed':
            mf.executeCommand(['typedText', action.text])
            break
          case 'command':
            mf.executeCommand(action.command)
            break
          case 'clear':
            mf.setValue('')
            latest.current.onChange('')
            break
        }
      },
    }),
    [],
  )

  useEffect(() => {
    let disposed = false
    let element: MathfieldElement | null = null
    let onInput: (() => void) | null = null

    import('./mathlive-setup')
      .then(({ MathfieldElement: Field }) => {
        if (disposed || !host.current) return
        element = new Field()
        element.mathVirtualKeyboardPolicy = 'manual'
        element.smartMode = false
        element.setAttribute('aria-label', ariaLabel)
        element.value = latest.current.value
        onInput = () => latest.current.onChange(element?.value ?? '')
        element.addEventListener('input', onInput)
        host.current.appendChild(element)
        // the menu setter requires a mounted element
        element.menuItems = []
        field.current = element
        setStatus('ready')
      })
      .catch((error: unknown) => {
        console.error('MathLive could not be loaded; using the plain LaTeX input instead.', error)
        if (!disposed) setStatus('failed')
      })

    return () => {
      disposed = true
      if (element && onInput) element.removeEventListener('input', onInput)
      element?.remove()
      field.current = null
    }
    // aria-label is static for the lifetime of the element
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const mf = field.current
    if (mf && mf.value !== value) mf.setValue(value, { silenceNotifications: true })
  }, [value, status])

  if (status === 'failed') {
    return (
      <input
        className={styles.fallback}
        type="text"
        value={value}
        aria-label={`${ariaLabel} (editor de texto LaTeX)`}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <div className={styles.host}>
      <div ref={host} className={styles.mount} />
      {status === 'loading' ? <span className={styles.loading}>Cargando editor matemático…</span> : null}
    </div>
  )
}
