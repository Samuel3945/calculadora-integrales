import { describe, expect, it } from 'vitest'
import { groupByPanel } from './groupPanels'

describe('groupByPanel', () => {
  it('attaches evaluation rows to their panel and keeps empty panels', () => {
    const row = (panel: number, index: number) => ({ index, panel, x: 0, fx: 0, weight: 0, contribution: 0, shared: false })
    const grouped = groupByPanel(
      [
        { index: 1, start: 0, end: 1, approximation: 1 },
        { index: 2, start: 1, end: 2, approximation: 2 },
        { index: 3, start: 2, end: 3, approximation: 3 },
      ],
      [row(1, 1), row(2, 2), row(1, 3)],
    )
    expect(grouped.map((g) => g.rows.map((r) => r.index))).toEqual([[1, 3], [2], []])
  })
})
