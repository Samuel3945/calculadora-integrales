import type { MethodFamily, MethodId, MethodInfo } from '@/shared/api'
import type { MethodView } from '../model/types'

/** Spanish UI copy per method id. Numeric facts (degree, nodes, order, formula) come from GET /methods. */
interface MethodCopy {
  name: string
  shortName: string
  description: string
}

export const METHOD_COPY: Record<MethodId, MethodCopy> = {
  closed_trapezoid: {
    name: 'Trapecio',
    shortName: 'Trapecio',
    description: 'Sustituye la función por una recta en cada panel.',
  },
  closed_simpson_13: {
    name: 'Simpson 1/3',
    shortName: 'Simpson 1/3',
    description: 'Sustituye la función por una parábola en cada panel.',
  },
  closed_simpson_38: {
    name: 'Simpson 3/8',
    shortName: 'Simpson 3/8',
    description: 'Sustituye la función por un polinomio cúbico en cada panel.',
  },
  closed_boole: {
    name: 'Regla de Boole',
    shortName: 'Boole',
    description: 'Sustituye la función por un polinomio de grado 4 en cada panel.',
  },
  open_midpoint: {
    name: 'Punto medio',
    shortName: 'Punto medio',
    description: 'Un único nodo en el centro de cada panel; nunca evalúa los extremos.',
  },
  open_newton_cotes_2: {
    name: 'Newton-Cotes abierto · 2 puntos',
    shortName: 'N-C abierto · 2 pts',
    description: 'Dos nodos interiores en W/3 y 2W/3 de cada panel.',
  },
  open_newton_cotes_3: {
    name: 'Newton-Cotes abierto · 3 puntos',
    shortName: 'N-C abierto · 3 pts',
    description: 'Tres nodos interiores en W/4, W/2 y 3W/4; el peso central es negativo.',
  },
  open_newton_cotes_4: {
    name: 'Newton-Cotes abierto · 4 puntos',
    shortName: 'N-C abierto · 4 pts',
    description: 'Cuatro nodos interiores en W/5, 2W/5, 3W/5 y 4W/5.',
  },
}

/** Presentation order, grouped by family. */
export const METHOD_IDS_BY_FAMILY: Record<MethodFamily, readonly MethodId[]> = {
  closed: ['closed_trapezoid', 'closed_simpson_13', 'closed_simpson_38', 'closed_boole'],
  open: ['open_midpoint', 'open_newton_cotes_2', 'open_newton_cotes_3', 'open_newton_cotes_4'],
}

export const ALL_METHOD_IDS: readonly MethodId[] = [...METHOD_IDS_BY_FAMILY.closed, ...METHOD_IDS_BY_FAMILY.open]

export const FAMILY_LABEL: Record<MethodFamily, string> = { closed: 'Cerrado', open: 'Abierto' }

export const FAMILY_HINT: Record<MethodFamily, string> = {
  closed: 'Usan los extremos de cada panel como nodos.',
  open: 'Solo usan nodos interiores: nunca evalúan los extremos del panel.',
}

export const VARIANT_LABEL: Record<'simple' | 'composite', string> = { simple: 'Simple', composite: 'Compuesta' }

export function getMethodCopy(id: MethodId): MethodCopy {
  return METHOD_COPY[id]
}

/** Merges the API catalogue with the Spanish copy; ids unknown to the UI are ignored. */
export function mergeMethods(methods: readonly MethodInfo[]): MethodView[] {
  const byId = new Map(methods.map((m) => [m.id, m]))
  const merged: MethodView[] = []
  for (const id of ALL_METHOD_IDS) {
    const info = byId.get(id)
    if (info) merged.push({ ...info, ...METHOD_COPY[id] })
  }
  return merged
}
