import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { compareMethods, type CompareRequest } from '@/shared/api'
import { useComparedResult, useCompareRequest, useIntegralActions } from '@/entities/integral'

const COMPARE_KEY = ['compare-methods'] as const

/**
 * POST /integrals/compare for the current integral, variant and panels.
 * With `auto`, runs once on mount when there is no up-to-date comparison in the store.
 */
export function useCompareMethods({ auto = false }: { auto?: boolean } = {}) {
  const request = useCompareRequest()
  const { compared, isStale } = useComparedResult()
  const { saveCompared, clearCompared } = useIntegralActions()

  const mutation = useMutation({
    mutationKey: COMPARE_KEY,
    mutationFn: ({ request: body }: { request: CompareRequest; key: string }) => compareMethods(body),
    onSuccess: (response, variables) => saveCompared({ key: variables.key, response }),
    onError: () => clearCompared(),
  })

  const run = () => {
    if (request.ok) mutation.mutate({ request: request.request, key: request.key })
  }

  const autoStarted = useRef<string | null>(null)
  const needsRun = request.ok && (compared === null || isStale)
  const key = request.ok ? request.key : null
  useEffect(() => {
    if (!auto || !needsRun || key === null || autoStarted.current === key) return
    autoStarted.current = key
    run()
    // run() closes over the current request; it is intentionally keyed on `key` only
  }, [auto, needsRun, key])

  return {
    run,
    compared,
    isStale,
    isPending: mutation.isPending,
    error: mutation.isError ? mutation.error : null,
    blockedReason: request.ok ? null : request.message,
  }
}
