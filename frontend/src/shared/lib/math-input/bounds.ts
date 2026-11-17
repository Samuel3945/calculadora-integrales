/**
 * Normalises a user-typed integration bound into the contract grammar (numbers or constant
 * expressions such as `pi/2`, `E`, `-1/3`). Whitelist-style: only the cosmetic replacements below are
 * applied; the server still validates the result.
 */
export type BoundNormalization = { ok: true; value: string } | { ok: false; message: string }

export function normalizeBound(raw: string): BoundNormalization {
  let value = raw.trim()
  if (value === '') return { ok: false, message: 'Escribe un valor para el límite.' }
  if (value.length > 64) return { ok: false, message: 'El límite es demasiado largo.' }

  value = value
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/[−–]/g, '-')
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/(?<![A-Za-z0-9_.])e(?![A-Za-z0-9_])/g, 'E')
    .replace(/\s+/g, '')

  if (!/^[0-9A-Za-z_+\-*/^().]+$/.test(value)) {
    return { ok: false, message: 'El límite solo admite números, π, e y operadores aritméticos.' }
  }
  return { ok: true, value }
}

/** Plain decimal numbers are sent as JSON numbers, anything else as the normalised string. */
export function toBoundPayload(normalized: string): number | string {
  return /^-?(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : normalized
}
