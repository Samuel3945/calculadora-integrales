import { describe, expect, it } from 'vitest'
import { latexToCanonical } from './latexToCanonical'

const ok = (latex: string, variable?: string) => {
  const result = latexToCanonical(latex, { variable })
  if (!result.ok) throw new Error(`expected success for ${latex}: ${result.message}`)
  return result.canonical
}
const message = (latex: string, variable?: string) => {
  const result = latexToCanonical(latex, { variable })
  if (result.ok) throw new Error(`expected rejection for ${latex}, got ${result.canonical}`)
  return result.message
}

describe('latexToCanonical: spec examples', () => {
  it.each([
    ['x^2', 'x**2'],
    ['x^{2}', 'x**2'],
    ['\\sin\\left(x\\right)', 'sin(x)'],
    ['\\cos\\left(x\\right)', 'cos(x)'],
    ['\\sqrt{x}', 'sqrt(x)'],
    ['\\exp\\left(x\\right)', 'exp(x)'],
    ['e^x', 'exp(x)'],
    ['e^{x}', 'exp(x)'],
    ['\\mathrm{e}^{x}', 'exp(x)'],
    ['\\exponentialE^{2x}', 'exp(2*x)'],
    ['\\ln\\left(x\\right)', 'log(x)'],
    ['\\log\\left(x\\right)', 'log(x)'],
    ['\\pi\\cdot x^2', 'pi*x**2'],
    ['\\pi x^{2}', 'pi*x**2'],
    ['\\frac{x^2+1}{\\sqrt{x}}', '(x**2+1)/sqrt(x)'],
    ['\\left(x^2+1\\right)/\\sqrt{x}', '(x**2+1)/sqrt(x)'],
  ])('%s -> %s', (latex, expected) => {
    expect(ok(latex)).toBe(expected)
  })
})

describe('latexToCanonical: syntax coverage', () => {
  it.each([
    ['2x', '2*x'],
    ['3.5x', '3.5*x'],
    ['.5x', '0.5*x'],
    ['1{,}5x', '1.5*x'],
    ['2\\cdot x', '2*x'],
    ['2\\times x', '2*x'],
    ['x\\div 2', 'x/2'],
    ['x+1', 'x+1'],
    ['x-1', 'x-1'],
    ['x−1', 'x-1'],
    ['-x^2', '-x**2'],
    ['2\\cdot-x', '2*(-x)'],
    ['x-\\left(x+1\\right)', 'x-(x+1)'],
    ['x-\\left(2-x\\right)', 'x-(2-x)'],
    ['\\left(x+1\\right)^2', '(x+1)**2'],
    ['\\left(-x\\right)^2', '(-x)**2'],
    ['x^{-1}', 'x**(-1)'],
    ['x^{2+1}', 'x**(2+1)'],
    ['2^x', '2**x'],
    ['\\frac{1}{2x}', '1/(2*x)'],
    ['\\frac12', '1/2'],
    ['x\\frac{1}{2}', 'x*(1/2)'],
    ['\\left|x\\right|', 'abs(x)'],
    ['\\left|x-1\\right|', 'abs(x-1)'],
    ['|x|', 'abs(x)'],
    ['\\lvert x\\rvert', 'abs(x)'],
    ['2|x|', '2*abs(x)'],
    ['\\sin x', 'sin(x)'],
    ['\\sin 2x', 'sin(2*x)'],
    ['\\sin x\\cos x', 'sin(x)*cos(x)'],
    ['\\sin x+1', 'sin(x)+1'],
    ['\\sin\\left(x\\right)^2', 'sin(x)**2'],
    ['\\sin^2\\left(x\\right)', 'sin(x)**2'],
    ['\\sin^{2}x', 'sin(x)**2'],
    ['\\sin^{-1}\\left(x\\right)', 'asin(x)'],
    ['\\cos^{-1}\\left(x\\right)', 'acos(x)'],
    ['\\tan^{-1}\\left(x\\right)', 'atan(x)'],
    ['\\arcsin\\left(x\\right)', 'asin(x)'],
    ['\\arccos\\left(x\\right)', 'acos(x)'],
    ['\\arctan\\left(x\\right)', 'atan(x)'],
    ['\\sinh\\left(x\\right)', 'sinh(x)'],
    ['\\cosh\\left(x\\right)', 'cosh(x)'],
    ['\\tanh\\left(x\\right)', 'tanh(x)'],
    ['\\operatorname{sinh}\\left(x\\right)', 'sinh(x)'],
    ['\\tan\\left(x\\right)', 'tan(x)'],
    ['2\\sin\\left(x\\right)', '2*sin(x)'],
    ['\\sqrt{x^2+1}', 'sqrt(x**2+1)'],
    ['\\sqrt{\\sqrt{x}}', 'sqrt(sqrt(x))'],
    ['\\sin\\left(\\pi x\\right)', 'sin(pi*x)'],
    ['\\sin\\left(e^{x}\\right)', 'sin(exp(x))'],
    ['e', 'E'],
    ['e\\cdot x', 'E*x'],
    ['2e^{x}', '2*exp(x)'],
    ['(x+1)(x-1)', '(x+1)*(x-1)'],
    ['\\frac{\\sin\\left(x\\right)}{x}', 'sin(x)/x'],
    ['\\frac{1}{\\frac{1}{x}}', '1/(1/x)'],
  ])('%s -> %s', (latex, expected) => {
    expect(ok(latex)).toBe(expected)
  })

  it('ignores spacing commands', () => {
    expect(ok('x\\,\\cdot\\;x')).toBe('x*x')
    expect(ok(' \\sin \\left( x \\right) ')).toBe('sin(x)')
  })

  it('uses the configured variable', () => {
    expect(ok('t^2+1', 't')).toBe('t**2+1')
    expect(ok('\\sin\\left(t\\right)', 't')).toBe('sin(t)')
    expect(message('x^2', 't')).toContain('«t»')
  })
})

describe('latexToCanonical: rejections', () => {
  it('rejects empty input', () => {
    expect(message('')).toMatch(/Escribe una función/)
    expect(message('  \\, ')).toMatch(/Escribe una función/)
  })

  it.each([
    ['\\int_0^1 x', /subíndices/],
    ['\\sum x', /no está admitida/],
    ['\\text{hola}', /no está admitida/],
    ['\\mathrm{abc}', /no está admitida/],
    ['\\operatorname{foo}\\left(x\\right)', /no está admitida/],
    ['\\href{http://x}{y}', /no está admitida|no admitido/],
    ['\\begin{matrix}x\\end{matrix}', /no está admitida/],
    ['\\imaginaryI x', /no está admitida/],
    ['\\differentialD x', /no está admitida/],
    ['\\infty', /no está admitida/],
    ['x_1', /subíndices/],
    ['x!', /no admitido/],
    ['x%', /no admitido/],
    ['x=2', /no admitido/],
    ['x<2', /no admitido/],
    ['x&2', /no admitido/],
    ['x#', /no admitido/],
    ['\\{x\\}', /no está admitida/],
    ['\\\\', /no está admitida/],
  ])('rejects unknown notation %s', (latex, pattern) => {
    expect(message(latex)).toMatch(pattern)
  })

  it('rejects symbols that are neither the variable nor a constant', () => {
    expect(message('y^2')).toMatch(/Símbolo no admitido: «y»/)
    expect(message('2a')).toMatch(/Símbolo no admitido/)
    expect(message('X')).toMatch(/Símbolo no admitido/)
  })

  it('rejects incomplete or unbalanced input', () => {
    expect(message('\\left(x')).toMatch(/Falta cerrar/)
    expect(message('x+')).toMatch(/incompleta/)
    expect(message('\\frac{1}')).toMatch(/Falta un valor|incompleta/)
    expect(message('\\sqrt{x')).toMatch(/Falta cerrar/)
    expect(message('x)')).toMatch(/sin su paréntesis/)
    expect(message('\\sin')).toMatch(/Falta el argumento/)
    expect(message('\\sin\\left(x\\right)\\cdot')).toMatch(/incompleta/)
    expect(message('|x')).toMatch(/Falta cerrar/)
    expect(message('1.2.3')).toMatch(/Número mal formado/)
    expect(message('.')).toMatch(/Número mal formado/)
  })

  it('rejects empty MathLive placeholders', () => {
    expect(message('\\sin\\left(\\placeholder{}\\right)')).toMatch(/Completa los espacios vacíos/)
    expect(message('x^{\\placeholder[a]{}}')).toMatch(/Completa los espacios vacíos/)
  })

  it('rejects unsupported roots, delimiters, exponents and stacked powers', () => {
    expect(message('\\sqrt[3]{x}')).toMatch(/raíz cuadrada/)
    expect(message('\\left[x\\right]')).toMatch(/delimitador/)
    expect(message('\\left\\{x\\right\\}')).toMatch(/delimitador/)
    expect(message('\\sinh^{-1}\\left(x\\right)')).toMatch(/solo se admite en sin, cos y tan/)
    expect(message('x^2^3')).toMatch(/encadenar potencias/)
    expect(message('x^-1')).toMatch(/entre llaves/)
    expect(message('\\left(x\\right]')).toBeTruthy()
  })

  it('rejects an invalid variable', () => {
    expect(message('x', 'e')).toMatch(/distinta de e/)
    expect(message('x', 'E')).toMatch(/distinta de e/)
    expect(message('x', 'xy')).toMatch(/una sola letra/)
    expect(message('x', '1')).toMatch(/una sola letra/)
    expect(message('x', 'π')).toMatch(/una sola letra/)
  })

  it('never lets raw LaTeX through: output contains only canonical characters', () => {
    const samples = ['x^2', '\\frac{x^2+1}{\\sqrt{x}}', '\\sin^{-1}\\left(e^{x}\\right)', '\\left|x\\right|\\pi']
    for (const latex of samples) {
      expect(ok(latex)).toMatch(/^[A-Za-z0-9_+\-*/().]+$/)
    }
  })

  it('guards against absurd nesting', () => {
    const deep = `${'\\left('.repeat(200)}x${'\\right)'.repeat(200)}`
    expect(message(deep)).toMatch(/demasiado compleja/)
  })
})
