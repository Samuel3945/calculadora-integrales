import axios, { AxiosError } from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '../config'
import { ApiError } from './errors'

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

function isErrorEnvelope(data: unknown): data is { error: { code: string; details?: Record<string, unknown> } } {
  if (typeof data !== 'object' || data === null || !('error' in data)) return false
  const error = (data as { error: unknown }).error
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
}

/** Turns any axios failure into an ApiError (error envelope, timeout or network failure). */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (error.response) {
      const { data, status } = error.response
      if (isErrorEnvelope(data)) {
        return new ApiError(data.error.code, data.error.details ?? {}, status)
      }
      return new ApiError(status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN', {}, status)
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return new ApiError('TIMEOUT')
    return new ApiError('NETWORK_ERROR')
  }
  return new ApiError('UNKNOWN')
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
