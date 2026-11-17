import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api'
import { describeError, describeErrorCode, describeWarning } from './messages'

const CONTRACT_CODES = [
  'INVALID_EXPRESSION',
  'EXPRESSION_TOO_COMPLEX',
  'INVALID_VARIABLE',
  'INVALID_BOUNDS',
  'INVALID_PANELS',
  'UNKNOWN_METHOD',
  'UNKNOWN_VARIANT',
  'FUNCTION_EVALUATION_ERROR',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'NETWORK_ERROR',
  'TIMEOUT',
]

describe('describeErrorCode', () => {
  it.each(CONTRACT_CODES)('maps %s to Spanish text', (code) => {
    const text = describeErrorCode(code, {})
    expect(text.length).toBeGreaterThan(20)
    expect(text).not.toBe(describeErrorCode('SOMETHING_NEW'))
    expect(text).not.toMatch(/\b(the|is not|invalid|error)\b/i)
  })

  it('falls back to a generic Spanish message for unknown codes', () => {
    expect(describeErrorCode('SOMETHING_NEW')).toMatch(/error desconocido/)
  })

  it.each([
    ['division_by_zero', 'división por cero'],
    ['domain', 'fuera del dominio real'],
    ['infinite', 'valor infinito'],
    ['nan', 'valor no numérico'],
  ])('includes x and the %s reason for evaluation failures', (reason, spanish) => {
    const text = describeErrorCode('FUNCTION_EVALUATION_ERROR', { x: 0, reason })
    expect(text).toContain('x = 0')
    expect(text).toContain(spanish)
  })

  it('still works when evaluation details are missing', () => {
    expect(describeErrorCode('FUNCTION_EVALUATION_ERROR', {})).toMatch(/No se pudo evaluar la función\./)
  })
})

describe('describeError', () => {
  it('never exposes the server message', () => {
    const error = new ApiError('INVALID_EXPRESSION')
    expect(describeError(error)).toMatch(/expresión no es válida/)
    expect(describeError({ code: 'INVALID_BOUNDS', message: 'English text', details: {} })).not.toMatch(/English/)
    expect(describeError(new Error('boom'))).toMatch(/desconocido/)
    expect(describeError(null)).toMatch(/desconocido/)
  })
})

describe('describeWarning', () => {
  it.each(['EQUAL_BOUNDS', 'EXACT_TIMEOUT', 'EXACT_UNAVAILABLE', 'ESTIMATE_UNAVAILABLE', 'POSSIBLE_SINGULARITY', 'OTHER'])(
    'maps %s',
    (code) => {
      const text = describeWarning({ code, message: 'English', details: {} })
      expect(text).not.toMatch(/English/)
      expect(text.length).toBeGreaterThan(20)
    },
  )

  it('lists singularity points', () => {
    const text = describeWarning({ code: 'POSSIBLE_SINGULARITY', message: '', details: { points: [0, 1.5] } })
    expect(text).toContain('x = 0, 1.5')
  })
})
