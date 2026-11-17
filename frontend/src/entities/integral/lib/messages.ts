import { ApiError } from '@/shared/api'
import type { ApiWarning, EvaluationFailureReason, ExactStatus } from '@/shared/api'
import { formatShort } from '@/shared/lib/format'

/**
 * Single place that turns API error codes and warning codes into Spanish user-facing text.
 * Backend `message` strings (English) are never shown.
 */

const EVALUATION_REASONS: Record<EvaluationFailureReason, string> = {
  division_by_zero: 'división por cero',
  domain: 'fuera del dominio real',
  infinite: 'valor infinito',
  nan: 'valor no numérico',
}

const GENERIC_MESSAGES: Record<string, string> = {
  INVALID_EXPRESSION: 'La expresión no es válida. Revisa los paréntesis, los operadores y las funciones usadas.',
  EXPRESSION_TOO_COMPLEX: 'La expresión es demasiado larga o compleja. Simplifícala e inténtalo de nuevo.',
  INVALID_VARIABLE: 'La variable de integración debe ser una sola letra distinta de e.',
  INVALID_BOUNDS: 'Los límites no son válidos. Usa números o constantes como π, π/2 o e.',
  INVALID_PANELS: 'La cantidad de paneles no es válida. En la variante compuesta debe estar entre 2 y 10 000.',
  UNKNOWN_METHOD: 'El método seleccionado no existe en el servidor.',
  UNKNOWN_VARIANT: 'La variante seleccionada no existe en el servidor.',
  VALIDATION_ERROR: 'Algún dato de la solicitud no es válido. Revisa la expresión, los límites y las opciones.',
  INTERNAL_ERROR: 'El servidor tuvo un problema inesperado. Inténtalo de nuevo en unos instantes.',
  NOT_FOUND: 'El servidor no reconoce esta operación. Comprueba la dirección de la API configurada.',
  METHOD_NOT_ALLOWED: 'El servidor no admite esta operación. Comprueba la dirección de la API configurada.',
  NETWORK_ERROR: 'No hay conexión con el servidor. Comprueba que la API esté en ejecución.',
  TIMEOUT: 'El servidor tardó demasiado en responder. Prueba con menos paneles o sin el valor exacto.',
  UNKNOWN: 'Ocurrió un error desconocido al comunicarse con el servidor.',
}

function evaluationMessage(details: Record<string, unknown>): string {
  const x = typeof details.x === 'number' ? ` en x = ${formatShort(details.x)}` : ''
  const reasonKey = typeof details.reason === 'string' ? (details.reason as EvaluationFailureReason) : undefined
  const reason = reasonKey && reasonKey in EVALUATION_REASONS ? `: ${EVALUATION_REASONS[reasonKey]}` : ''
  return `No se pudo evaluar la función${x}${reason}. Prueba con otros límites o con otra cantidad de paneles.`
}

export function describeErrorCode(code: string, details: Record<string, unknown> = {}): string {
  if (code === 'FUNCTION_EVALUATION_ERROR') return evaluationMessage(details)
  return GENERIC_MESSAGES[code] ?? GENERIC_MESSAGES.UNKNOWN!
}

/** Accepts an ApiError, an error payload from a response body, or anything thrown. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return describeErrorCode(error.code, error.details)
  if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    const { code, details } = error as { code: string; details?: Record<string, unknown> }
    return describeErrorCode(code, details ?? {})
  }
  return GENERIC_MESSAGES.UNKNOWN!
}

export function describeWarning(warning: ApiWarning): string {
  switch (warning.code) {
    case 'EQUAL_BOUNDS':
      return 'Los límites son iguales: la integral vale 0 y no hay evaluaciones.'
    case 'POSSIBLE_SINGULARITY': {
      const points = Array.isArray(warning.details.points)
        ? (warning.details.points as unknown[]).filter((p): p is number => typeof p === 'number')
        : []
      const where = points.length > 0 ? ` (cerca de x = ${points.map(formatShort).join(', ')})` : ''
      return `La función podría tener una singularidad en el intervalo${where}. El resultado puede no ser fiable.`
    }
    case 'EXACT_TIMEOUT':
      return 'El cálculo simbólico del valor exacto superó el tiempo límite, así que no hay errores exactos.'
    case 'EXACT_UNAVAILABLE':
      return 'No se encontró una solución exacta para esta integral, así que no hay errores exactos.'
    case 'ESTIMATE_UNAVAILABLE':
      return 'No fue posible calcular el error estimado con paneles adicionales.'
    default:
      return 'El servidor devolvió un aviso sobre este cálculo.'
  }
}

export function describeExactStatus(status: ExactStatus): string {
  switch (status) {
    case 'computed':
      return 'Calculado con SymPy'
    case 'disabled':
      return 'Desactivado'
    case 'timeout':
      return 'Tiempo agotado'
    case 'unavailable':
      return 'No disponible'
  }
}
