import { describe, expect, it } from 'vitest'
import { initialIntegralState, integralReducer } from './reducer'

describe('integralReducer', () => {
  it('keeps bounds in a single place', () => {
    const next = integralReducer(initialIntegralState, { type: 'upperChanged', value: 'pi/2' })
    expect(next.upper).toBe('pi/2')
    expect(next.lower).toBe('0')
  })

  it('selects the first method of the new family', () => {
    const next = integralReducer(initialIntegralState, { type: 'familyChanged', family: 'open' })
    expect(next.family).toBe('open')
    expect(next.methodId).toBe('open_midpoint')
  })

  it('clamps panels to 2..10000 and graph points to 50..2000', () => {
    expect(integralReducer(initialIntegralState, { type: 'panelsChanged', panels: 1 }).panels).toBe(2)
    expect(integralReducer(initialIntegralState, { type: 'panelsChanged', panels: 99999 }).panels).toBe(10000)
    expect(integralReducer(initialIntegralState, { type: 'panelsChanged', panels: Number.NaN }).panels).toBe(2)
    expect(integralReducer(initialIntegralState, { type: 'optionChanged', patch: { graphPoints: 10 } }).options.graphPoints).toBe(50)
    expect(integralReducer(initialIntegralState, { type: 'optionChanged', patch: { graphPoints: 9000 } }).options.graphPoints).toBe(2000)
  })

  it('does not change the panel count when switching to simple', () => {
    const composite = integralReducer(initialIntegralState, { type: 'panelsChanged', panels: 7 })
    const simple = integralReducer(composite, { type: 'variantChanged', variant: 'simple' })
    expect(simple.panels).toBe(7)
  })
})
