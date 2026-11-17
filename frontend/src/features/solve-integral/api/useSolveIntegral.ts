import { useMutation, useMutationState } from '@tanstack/react-query'
import { solveIntegral, type SolveRequest } from '@/shared/api'
import { useIntegralActions, useSolveRequest } from '@/entities/integral'

const SOLVE_KEY = ['solve-integral'] as const

/** Runs POST /integrals/solve for the current inputs and stores the snapshot in the integral store. */
export function useSolveIntegral() {
  const request = useSolveRequest()
  const { saveSolved, clearSolved } = useIntegralActions()

  const mutation = useMutation({
    mutationKey: SOLVE_KEY,
    mutationFn: ({ request: body }: { request: SolveRequest; key: string }) => solveIntegral(body),
    onSuccess: (response, variables) => saveSolved({ key: variables.key, response }),
    onError: () => clearSolved(),
  })

  const solve = () => {
    if (request.ok) mutation.mutate({ request: request.request, key: request.key })
  }

  return {
    solve,
    isPending: mutation.isPending,
    blockedReason: request.ok ? null : request.message,
  }
}

/** Latest solve mutation state, readable from any component (the mutation itself lives in the button). */
export function useSolveStatus() {
  const states = useMutationState({ filters: { mutationKey: SOLVE_KEY }, select: (m) => m.state })
  const latest = states.at(-1)
  return {
    isPending: latest?.status === 'pending',
    error: latest?.status === 'error' ? latest.error : null,
  }
}
