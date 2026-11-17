import { describe, expect, it } from 'vitest'
import {
  formatCell,
  formatErrorOrder,
  formatFixed,
  formatPercent,
  formatScientific,
  formatShort,
  toSuperscript,
} from './index'

describe('format', () => {
  it('formats superscripts and error orders', () => {
    expect(toSuperscript('-12')).toBe('⁻¹²')
    expect(formatErrorOrder(4)).toBe('O(h⁴)')
  })

  it('formats scientific notation like the design', () => {
    expect(formatScientific(0.0045597549844207, 4)).toBe('4.5598 × 10⁻³')
    expect(formatScientific(0.4292036732, 3)).toBe('4.292 × 10⁻¹')
    expect(formatScientific(0, 3)).toBe('0')
    expect(formatScientific(null)).toBe('—')
  })

  it('formats fixed values and handles huge magnitudes', () => {
    expect(formatFixed(2.0045597549844207)).toBe('2.0045597550')
    expect(formatFixed(1e15)).toContain('×')
    expect(formatFixed(Number.NaN)).toBe('—')
  })

  it('formats percentages from fractions', () => {
    expect(formatPercent(0.0022798774922104)).toBe('0.2280 %')
    expect(formatPercent(0)).toBe('0 %')
    expect(formatPercent(1e-9)).toBe('1.00 × 10⁻⁷ %')
    expect(formatPercent(null)).toBe('—')
  })

  it('formats table cells and short numbers', () => {
    expect(formatCell(0.7071067811865476)).toBe('0.707107')
    expect(formatCell(0)).toBe('0.000000')
    expect(formatCell(1e-9)).toContain('×')
    expect(formatShort(Math.PI)).toBe('3.14159')
    expect(formatShort(2)).toBe('2')
    expect(formatShort(0)).toBe('0')
  })
})
