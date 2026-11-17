import type { ApiErrorCode, ApiErrorPayload } from './types'

/** Normalised failure thrown by every endpoint function. UI code maps `code` to Spanish text. */
export class ApiError extends Error {
  readonly code: ApiErrorCode | string
  readonly details: Record<string, unknown>
  readonly httpStatus: number | null

  constructor(code: ApiErrorCode | string, details: Record<string, unknown> = {}, httpStatus: number | null = null) {
    // The server message is intentionally NOT kept: the UI never shows backend text verbatim.
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.httpStatus = httpStatus
  }

  static fromPayload(payload: ApiErrorPayload, httpStatus: number | null = null): ApiError {
    return new ApiError(payload.code, payload.details ?? {}, httpStatus)
  }
}
