import { ConfigurationSidebar, ExpressionWorkspace } from '@/widgets/calculator-workspace'
import { ProcedureCard, ResultsCard } from '@/widgets/calculation-results'
import { GraphCard } from '@/widgets/integral-visualization'
import styles from './CalculatorPage.module.css'

interface CalculatorPageProps {
  onOpenComparison: () => void
}

/**
 * Desktop: left column (editor, integral, result, graph, procedure) + right configuration column.
 * Phone: single column in the order of the approved mobile design (config right after the integral).
 */
export function CalculatorPage({ onOpenComparison }: CalculatorPageProps) {
  return (
    <main className={styles.layout}>
      <ExpressionWorkspace />
      <ResultsCard />
      <GraphCard />
      <ProcedureCard />
      <ConfigurationSidebar onOpenComparison={onOpenComparison} />
    </main>
  )
}
