import { useState } from 'react'
import { ComparisonPage } from '@/pages/comparison'
import { CalculatorPage } from '@/pages/calculator'
import { AppHeader, type AppView } from '@/widgets/app-header'
import { AppProviders } from './providers'

/**
 * The app has two views and no URL routing: the active view is plain state (see README, «No router»).
 * Both pages stay independent; shared data lives in the integral store, so switching keeps the inputs.
 */
export function App() {
  const [view, setView] = useState<AppView>('calculator')
  return (
    <AppProviders>
      <AppHeader view={view} onChangeView={setView} />
      {view === 'calculator' ? (
        <CalculatorPage onOpenComparison={() => setView('comparison')} />
      ) : (
        <ComparisonPage onEditIntegral={() => setView('calculator')} />
      )}
    </AppProviders>
  )
}
