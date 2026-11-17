import { http } from './http'
import type {
  CompareRequest,
  CompareResponse,
  HealthResponse,
  MethodsResponse,
  SolveRequest,
  SolveResponse,
  ValidateRequest,
  ValidateResponse,
} from './types'

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await http.get<HealthResponse>('/health', { signal })
  return data
}

export async function fetchMethods(signal?: AbortSignal): Promise<MethodsResponse> {
  const { data } = await http.get<MethodsResponse>('/methods', { signal })
  return data
}

export async function validateExpression(body: ValidateRequest, signal?: AbortSignal): Promise<ValidateResponse> {
  const { data } = await http.post<ValidateResponse>('/expressions/validate', body, { signal })
  return data
}

export async function solveIntegral(body: SolveRequest, signal?: AbortSignal): Promise<SolveResponse> {
  const { data } = await http.post<SolveResponse>('/integrals/solve', body, { signal })
  return data
}

export async function compareMethods(body: CompareRequest, signal?: AbortSignal): Promise<CompareResponse> {
  const { data } = await http.post<CompareResponse>('/integrals/compare', body, { signal })
  return data
}
