import { useIntegral, useIntegralActions, type Variant } from '@/entities/integral'
import { Segmented } from '@/shared/ui'
import styles from './configure.module.css'

const OPTIONS: ReadonlyArray<{ value: Variant; label: string }> = [
  { value: 'simple', label: 'Simple' },
  { value: 'composite', label: 'Compuesta' },
]

export function VariantSelector() {
  const { variant } = useIntegral()
  const { setVariant } = useIntegralActions()
  return (
    <div className={styles.group}>
      <span className={styles.label}>Variante</span>
      <Segmented options={OPTIONS} value={variant} onChange={setVariant} ariaLabel="Variante" />
    </div>
  )
}
