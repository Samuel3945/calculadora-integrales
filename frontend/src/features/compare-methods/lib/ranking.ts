import type { CompareResponse, CompareResult } from '@/shared/api'

/** Digits are display formatting of an API value: −log10(relative error), clamped to [0, 16]. */
export const MAX_DIGITS = 16

export function correctDigits(relativeError: number | null): number | null {
  if (relativeError === null || !Number.isFinite(relativeError)) return null
  if (relativeError <= 0) return MAX_DIGITS
  return Math.min(MAX_DIGITS, Math.max(0, -Math.log10(relativeError)))
}

export interface ComparisonRow {
  result: CompareResult
  digits: number | null
  isBest: boolean
  isCheapest: boolean
}

export interface ComparisonAnalysis {
  rows: ComparisonRow[]
  /** False when the exact value is unavailable: error columns, bars and the «best» badge are hidden. */
  exactAvailable: boolean
  /** Upper end of the digits axis (even number, at least 6). */
  axisMax: number
}

export function analyzeComparison(response: CompareResponse): ComparisonAnalysis {
  const exactAvailable = response.exact.status === 'computed'
  const ok = response.results.filter((r) => r.status === 'ok')

  let bestIndex = -1
  if (exactAvailable) {
    let bestError = Number.POSITIVE_INFINITY
    response.results.forEach((r, i) => {
      if (r.status === 'ok' && r.absolute_error !== null && r.absolute_error < bestError) {
        bestError = r.absolute_error
        bestIndex = i
      }
    })
  }

  const evals = ok.map((r) => r.function_evaluations).filter((n): n is number => n !== null)
  const minEvals = evals.length > 0 ? Math.min(...evals) : null
  const allEqual = evals.length > 0 && evals.every((n) => n === evals[0])

  const rows = response.results.map<ComparisonRow>((result, i) => ({
    result,
    digits: exactAvailable && result.status === 'ok' ? correctDigits(result.relative_error) : null,
    isBest: i === bestIndex,
    isCheapest:
      result.status === 'ok' && !allEqual && minEvals !== null && result.function_evaluations === minEvals,
  }))

  const maxDigits = Math.max(0, ...rows.map((r) => r.digits ?? 0))
  const axisMax = Math.min(MAX_DIGITS, Math.max(6, Math.ceil(maxDigits / 2) * 2))
  return { rows, exactAvailable, axisMax }
}
