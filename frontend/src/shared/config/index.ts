/**
 * The only module that reads build-time environment variables.
 * VITE_API_BASE_URL must include the `/api/v1` prefix. In production builds without it the app
 * assumes a same-domain deployment and uses the relative path `/api/v1`.
 */
const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

export const API_BASE_URL: string = (configured && configured.length > 0 ? configured : '/api/v1').replace(
  /\/+$/,
  '',
)

/** The solve request may include a SymPy run (5 s server budget) plus a Richardson re-run. */
export const API_TIMEOUT_MS = 45_000

export const HEALTH_REFETCH_MS = 30_000

export const PANEL_LIMITS = { min: 2, max: 10_000 } as const
export const GRAPH_POINT_LIMITS = { min: 50, max: 2_000, default: 300 } as const
export const VALIDATION_DEBOUNCE_MS = 400
