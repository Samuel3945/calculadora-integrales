import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { buildCompareRequest, buildSolveRequest, type RequestBuild } from '../lib/requests'
import type { CompareRequest, SolveRequest } from '@/shared/api'
import { initialIntegralState, integralReducer, type IntegralAction } from './reducer'
import type { IntegralOptions, IntegralState, MethodFamily, MethodId, Variant } from './types'

interface StoreValue {
  state: IntegralState
  dispatch: (action: IntegralAction) => void
}

const IntegralContext = createContext<StoreValue | null>(null)

/** The single source of truth for the integral being edited (expression, bounds, method, results). */
export function IntegralProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(integralReducer, initialIntegralState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <IntegralContext value={value}>{children}</IntegralContext>
}

function useStore(): StoreValue {
  const value = useContext(IntegralContext)
  if (!value) throw new Error('useIntegral* hooks must be used inside <IntegralProvider>')
  return value
}

export function useIntegral(): IntegralState {
  return useStore().state
}

export function useIntegralActions() {
  const { dispatch } = useStore()
  return useMemo(
    () => ({
      setLatex: (latex: string) => dispatch({ type: 'latexChanged', latex }),
      setVariable: (variable: string) => dispatch({ type: 'variableChanged', variable }),
      setLower: (value: string) => dispatch({ type: 'lowerChanged', value }),
      setUpper: (value: string) => dispatch({ type: 'upperChanged', value }),
      setFamily: (family: MethodFamily) => dispatch({ type: 'familyChanged', family }),
      setMethod: (methodId: MethodId) => dispatch({ type: 'methodChanged', methodId }),
      setVariant: (variant: Variant) => dispatch({ type: 'variantChanged', variant }),
      setPanels: (panels: number) => dispatch({ type: 'panelsChanged', panels }),
      setOptions: (patch: Partial<IntegralOptions>) => dispatch({ type: 'optionChanged', patch }),
      saveSolved: (snapshot: Extract<IntegralAction, { type: 'solved' }>['snapshot']) =>
        dispatch({ type: 'solved', snapshot }),
      clearSolved: () => dispatch({ type: 'solveFailed' }),
      clearCompared: () => dispatch({ type: 'compareFailed' }),
      saveCompared: (snapshot: Extract<IntegralAction, { type: 'compared' }>['snapshot']) =>
        dispatch({ type: 'compared', snapshot }),
    }),
    [dispatch],
  )
}

export function useSolveRequest(): RequestBuild<SolveRequest> {
  const s = useIntegral()
  const { latex, variable, lower, upper, methodId, variant, panels, options } = s
  return useMemo(
    () => buildSolveRequest({ latex, variable, lower, upper, methodId, variant, panels, options }),
    [latex, variable, lower, upper, methodId, variant, panels, options],
  )
}

export function useCompareRequest(): RequestBuild<CompareRequest> {
  const { latex, variable, lower, upper, variant, panels, options } = useIntegral()
  const calculateExact = options.calculateExact
  return useMemo(
    () => buildCompareRequest({ latex, variable, lower, upper, variant, panels, calculateExact }),
    [latex, variable, lower, upper, variant, panels, calculateExact],
  )
}

/** Last solve response plus whether the inputs changed since (drives the yellow stale banner). */
export function useSolvedResult() {
  const { solved } = useIntegral()
  const request = useSolveRequest()
  const currentKey = request.ok ? request.key : null
  return { solved, isStale: solved !== null && solved.key !== currentKey }
}

export function useComparedResult() {
  const { compared } = useIntegral()
  const request = useCompareRequest()
  const currentKey = request.ok ? request.key : null
  return { compared, isStale: compared !== null && compared.key !== currentKey }
}
