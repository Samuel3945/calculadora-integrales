import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchMethods } from '@/shared/api'
import { mergeMethods, type MethodView } from '@/entities/integral'

/** GET /methods merged with the Spanish catalogue. Static server data: cached for the session. */
export function useMethods() {
  const query = useQuery({
    queryKey: ['methods'],
    queryFn: ({ signal }) => fetchMethods(signal),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const methods = useMemo<MethodView[] | undefined>(
    () => (query.data ? mergeMethods(query.data.methods) : undefined),
    [query.data],
  )
  return { methods, query }
}

export function useSelectedMethod(methodId: string): MethodView | undefined {
  const { methods } = useMethods()
  return methods?.find((m) => m.id === methodId)
}
