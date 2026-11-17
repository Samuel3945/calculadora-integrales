import { ComparisonView } from '@/widgets/method-comparison'
import styles from './ComparisonPage.module.css'

interface ComparisonPageProps {
  onEditIntegral: () => void
}

export function ComparisonPage({ onEditIntegral }: ComparisonPageProps) {
  return (
    <main className={styles.page}>
      <ComparisonView onEditIntegral={onEditIntegral} />
    </main>
  )
}
