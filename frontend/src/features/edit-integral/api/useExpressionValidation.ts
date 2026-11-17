import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { validateExpression } from '@/shared/api'
import { VALIDATION_DEBOUNCE_MS } from '@/shared/config'
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'
import { latexToCanonical } from '@/shared/lib/math-input'
import { describeError, useIntegral } from '@/entities/integral'

export type ExpressionStatus =
  | { kind: 'rejected'; message: string }
  | { kind: 'checking' }
  | { kind: 'unreachable'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'valid'; canonical: string; latex: string }

export interface ExpressionValidation {
  status: ExpressionStatus
  /** Canonical string that is (or would be) sent to the server; null when the editor content is rejected. */
  canonical: string | null
  /** Last backend-rendered LaTeX that validated successfully (kept while the user keeps typing). */
  lastValidLatex: string | null
}

/**
 * Converts the editor content with the whitelisted converter, then validates it against
 * POST /expressions/validate (debounced). Components never call axios directly.
 */
export function useExpressionValidation(): ExpressionValidation {
  const { latex, variable } = useIntegral()
  const conversion = useMemo(() => latexToCanonical(latex, { variable }), [latex, variable])
  const canonical = conversion.ok ? conversion.canonical : null
  const debounced = useDebouncedValue(canonical, VALIDATION_DEBOUNCE_MS)

  const query = useQuery({
    queryKey: ['validate-expression', debounced, variable],
    queryFn: ({ signal }) => validateExpression({ expression: debounced as string, variable }, signal),
    enabled: debounced !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  const [lastValidLatex, setLastValidLatex] = useState<string | null>(null)
  const validLatex = query.data?.valid ? query.data.latex : null
  useEffect(() => {
    if (validLatex) setLastValidLatex(validLatex)
  }, [validLatex])

  let status: ExpressionStatus
  if (!conversion.ok) {
    status = { kind: 'rejected', message: conversion.message }
  } else if (debounced !== canonical || query.isPending) {
    status = query.isError ? { kind: 'unreachable', message: describeError(query.error) } : { kind: 'checking' }
  } else if (query.isError) {
    status = { kind: 'unreachable', message: describeError(query.error) }
  } else if (query.data?.valid && query.data.canonical !== null && query.data.latex !== null) {
    status = { kind: 'valid', canonical: query.data.canonical, latex: query.data.latex }
  } else {
    status = { kind: 'invalid', message: describeError(query.data?.error ?? { code: 'INVALID_EXPRESSION' }) }
  }

  return { status, canonical, lastValidLatex }
}
