import type { EvaluationRow, PanelRow } from '@/entities/integral'

export interface PanelDetail {
  panel: PanelRow
  rows: EvaluationRow[]
}

/** Pairs each panel from the response with its evaluation rows (pure grouping, no arithmetic). */
export function groupByPanel(panels: PanelRow[], evaluations: EvaluationRow[]): PanelDetail[] {
  const byPanel = new Map<number, EvaluationRow[]>()
  for (const row of evaluations) {
    const list = byPanel.get(row.panel)
    if (list) list.push(row)
    else byPanel.set(row.panel, [row])
  }
  return panels.map((panel) => ({ panel, rows: byPanel.get(panel.index) ?? [] }))
}
