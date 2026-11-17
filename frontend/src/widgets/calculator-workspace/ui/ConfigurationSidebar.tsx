import { RangeFields } from '@/features/edit-integral'
import {
  FamilySelector,
  MethodInfoCard,
  MethodSelector,
  OptionsFieldset,
  PanelStepper,
  VariantSelector,
} from '@/features/configure-method'
import { SolveButton } from '@/features/solve-integral'
import { Button, Card } from '@/shared/ui'
import styles from './workspace.module.css'

interface ConfigurationSidebarProps {
  onOpenComparison: () => void
}

export function ConfigurationSidebar({ onOpenComparison }: ConfigurationSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Configuración de la integral">
      <Card title="Configuración" headingId="config-title" gap="lg">
        <RangeFields />
        <FamilySelector />
        <MethodSelector />
        <VariantSelector />
        <PanelStepper />
        <OptionsFieldset />
        <SolveButton />
        <Button onClick={onOpenComparison}>Comparar los 8 métodos</Button>
      </Card>
      <MethodInfoCard />
    </aside>
  )
}
