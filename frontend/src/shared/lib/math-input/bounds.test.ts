import { describe, expect, it } from 'vitest'
import { normalizeBound, toBoundPayload } from './bounds'

describe('normalizeBound', () => {
  it.each([
    ['0', '0'],
    [' 1.5 ', '1.5'],
    ['-1/3', '-1/3'],
    ['π', 'pi'],
    ['π/2', 'pi/2'],
    ['2π', '2pi'],
    ['2*π', '2*pi'],
    ['−π', '-pi'],
    ['e', 'E'],
    ['e^2', 'E^2'],
    ['1e-3', '1e-3'],
    ['exp(1)', 'exp(1)'],
    ['sqrt(2)', 'sqrt(2)'],
    ['√2', 'sqrt2'],
    ['0,5', '0.5'],
    ['pi / 2', 'pi/2'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeBound(raw)).toEqual({ ok: true, value: expected })
  })

  it('rejects empty and unsafe input', () => {
    expect(normalizeBound('   ')).toMatchObject({ ok: false })
    expect(normalizeBound('__import__("os")')).toMatchObject({ ok: false })
    expect(normalizeBound('1; 2')).toMatchObject({ ok: false })
    expect(normalizeBound('x'.repeat(100))).toMatchObject({ ok: false })
  })
})

describe('toBoundPayload', () => {
  it('sends plain decimals as numbers and constants as strings', () => {
    expect(toBoundPayload('0')).toBe(0)
    expect(toBoundPayload('-2.5')).toBe(-2.5)
    expect(toBoundPayload('.5')).toBe(0.5)
    expect(toBoundPayload('pi/2')).toBe('pi/2')
    expect(toBoundPayload('E')).toBe('E')
  })
})
