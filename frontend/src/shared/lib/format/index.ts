/** Display formatting only. No numerical work: every value shown here comes from the API. */

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
  '+': '⁺',
}

export function toSuperscript(text: string): string {
  return [...text].map((ch) => SUPERSCRIPTS[ch] ?? ch).join('')
}

export const NOT_AVAILABLE = '—'

const isNumber = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

/** Scientific notation as «4.5598 × 10⁻³». `decimals` is the number of mantissa decimals. */
export function formatScientific(value: number | null | undefined, decimals = 4): string {
  if (!isNumber(value)) return NOT_AVAILABLE
  if (value === 0) return '0'
  const [mantissa = '0', exponent = '0'] = value.toExponential(decimals).split('e')
  return `${mantissa} × 10${toSuperscript(String(Number(exponent)))}`
}

/** Fixed decimals for values of ordinary magnitude, scientific notation for very large ones. */
export function formatFixed(value: number | null | undefined, decimals = 10): string {
  if (!isNumber(value)) return NOT_AVAILABLE
  if (Math.abs(value) >= 1e12) return formatScientific(value, 6)
  return value.toFixed(decimals)
}

/** Values in the evaluations table (fixed 6 decimals unless the magnitude would hide the value). */
export function formatCell(value: number | null | undefined): string {
  if (!isNumber(value)) return NOT_AVAILABLE
  if (value !== 0 && (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e9)) return formatScientific(value, 3)
  return value.toFixed(6)
}

/** Fraction -> percentage text. Input is the API's relative error (a fraction, not a percentage). */
export function formatPercent(fraction: number | null | undefined): string {
  if (!isNumber(fraction)) return NOT_AVAILABLE
  const percent = fraction * 100
  if (percent === 0) return '0 %'
  if (Math.abs(percent) >= 0.01) return `${percent.toFixed(4)} %`
  return `${formatScientific(percent, 2)} %`
}

/** Compact number for axis labels, bounds and hints (up to 6 significant digits, no trailing zeros). */
export function formatShort(value: number | null | undefined): string {
  if (!isNumber(value)) return NOT_AVAILABLE
  if (value === 0) return '0'
  if (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e7) return formatScientific(value, 3)
  return String(Number(value.toPrecision(6)))
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('es').format(value)
}

export function formatErrorOrder(order: number): string {
  return `O(h${toSuperscript(String(order))})`
}
