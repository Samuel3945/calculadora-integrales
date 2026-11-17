import { FAMILY_HINT, useIntegral, useIntegralActions, type MethodFamily } from '@/entities/integral'
import { Segmented } from '@/shared/ui'
import styles from './configure.module.css'

const OPTIONS: ReadonlyArray<{ value: MethodFamily; label: string }> = [
  { value: 'closed', label: 'Cerrados' },
  { value: 'open', label: 'Abiertos' },
]

export function FamilySelector() {
  const { family } = useIntegral()
  const { setFamily } = useIntegralActions()
  return (
    <div className={styles.group}>
      <span className={styles.label} id="family-label">
        Familia del método
      </span>
      <Segmented options={OPTIONS} value={family} onChange={setFamily} ariaLabel="Familia del método" />
      <p className={styles.hint}>{FAMILY_HINT[family]}</p>
    </div>
  )
}
