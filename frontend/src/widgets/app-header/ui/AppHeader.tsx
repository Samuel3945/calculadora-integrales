import { ApiStatusPill } from './ApiStatusPill'
import styles from './AppHeader.module.css'

export type AppView = 'calculator' | 'comparison'

interface AppHeaderProps {
  view: AppView
  onChangeView: (view: AppView) => void
}

const TABS: ReadonlyArray<{ view: AppView; label: string; shortLabel: string }> = [
  { view: 'calculator', label: 'Calcular', shortLabel: 'Calcular' },
  { view: 'comparison', label: 'Comparar métodos', shortLabel: 'Comparar' },
]

export function AppHeader({ view, onChangeView }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            ∫
          </div>
          <div>
            <h1 className={styles.title}>Calculadora de integrales</h1>
            <p className={styles.subtitle}>Métodos de Newton-Cotes abiertos y cerrados · simples y compuestos</p>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Secciones">
          {TABS.map((tab) => (
            <button
              key={tab.view}
              type="button"
              className={styles.tab}
              aria-current={view === tab.view ? 'page' : undefined}
              onClick={() => onChangeView(tab.view)}
            >
              <span className={styles.tabLong}>{tab.label}</span>
              <span className={styles.tabShort}>{tab.shortLabel}</span>
            </button>
          ))}
        </nav>
        <ApiStatusPill />
      </div>
    </header>
  )
}
