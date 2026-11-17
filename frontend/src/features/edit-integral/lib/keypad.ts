export type KeyKind = 'math' | 'fn' | 'op' | 'ctrl'

/** What a keypad key does to the MathLive field. Interpreted by MathField (the only MathLive consumer). */
export type KeyAction =
  | { type: 'insert'; latex: string }
  | { type: 'typed'; text: string }
  | { type: 'command'; command: 'moveToPreviousChar' | 'moveToNextChar' | 'deleteBackward' }
  | { type: 'clear' }

export interface KeypadKey {
  id: string
  label: string
  ariaLabel: string
  kind: KeyKind
  action: KeyAction
}

const fn = (id: string, label: string, ariaLabel: string, latexName: string): KeypadKey => ({
  id,
  label,
  ariaLabel,
  kind: 'fn',
  action: { type: 'insert', latex: `${latexName}\\left(#@\\right)` },
})

/** `variable` is the integration variable currently configured (the x / x² keys follow it). */
export function buildKeypad(variable: string): KeypadKey[] {
  return [
    { id: 'var', label: variable, ariaLabel: `Variable ${variable}`, kind: 'math', action: { type: 'insert', latex: variable } },
    {
      id: 'square',
      label: `${variable}²`,
      ariaLabel: 'Al cuadrado',
      kind: 'math',
      action: { type: 'insert', latex: `${variable}^{2}` },
    },
    { id: 'power', label: `${variable}ⁿ`, ariaLabel: 'Potencia', kind: 'math', action: { type: 'typed', text: '^' } },
    { id: 'sqrt', label: '√', ariaLabel: 'Raíz cuadrada', kind: 'math', action: { type: 'insert', latex: '\\sqrt{#@}' } },
    { id: 'lparen', label: '(', ariaLabel: 'Abrir paréntesis', kind: 'math', action: { type: 'typed', text: '(' } },
    { id: 'rparen', label: ')', ariaLabel: 'Cerrar paréntesis', kind: 'math', action: { type: 'typed', text: ')' } },
    { id: 'pi', label: 'π', ariaLabel: 'Pi', kind: 'math', action: { type: 'insert', latex: '\\pi' } },
    { id: 'euler', label: 'e', ariaLabel: 'Número e', kind: 'math', action: { type: 'insert', latex: 'e' } },
    fn('sin', 'sin', 'Seno', '\\sin'),
    fn('cos', 'cos', 'Coseno', '\\cos'),
    fn('tan', 'tan', 'Tangente', '\\tan'),
    fn('ln', 'ln', 'Logaritmo natural', '\\ln'),
    fn('exp', 'exp', 'Exponencial', '\\exp'),
    {
      id: 'abs',
      label: `|${variable}|`,
      ariaLabel: 'Valor absoluto',
      kind: 'fn',
      action: { type: 'insert', latex: '\\left|#@\\right|' },
    },
    { id: 'times', label: '×', ariaLabel: 'Multiplicar', kind: 'op', action: { type: 'insert', latex: '\\times' } },
    { id: 'div', label: '÷', ariaLabel: 'Dividir', kind: 'op', action: { type: 'insert', latex: '\\div' } },
    fn('asin', 'asin', 'Arcoseno', '\\arcsin'),
    fn('acos', 'acos', 'Arcocoseno', '\\arccos'),
    fn('atan', 'atan', 'Arcotangente', '\\arctan'),
    fn('sinh', 'sinh', 'Seno hiperbólico', '\\sinh'),
    fn('cosh', 'cosh', 'Coseno hiperbólico', '\\cosh'),
    fn('tanh', 'tanh', 'Tangente hiperbólica', '\\tanh'),
    { id: 'plus', label: '+', ariaLabel: 'Sumar', kind: 'op', action: { type: 'typed', text: '+' } },
    { id: 'minus', label: '−', ariaLabel: 'Restar', kind: 'op', action: { type: 'typed', text: '-' } },
    { id: 'left', label: '←', ariaLabel: 'Mover cursor a la izquierda', kind: 'ctrl', action: { type: 'command', command: 'moveToPreviousChar' } },
    { id: 'right', label: '→', ariaLabel: 'Mover cursor a la derecha', kind: 'ctrl', action: { type: 'command', command: 'moveToNextChar' } },
    { id: 'backspace', label: '⌫', ariaLabel: 'Borrar', kind: 'ctrl', action: { type: 'command', command: 'deleteBackward' } },
    { id: 'clear', label: 'Limpiar', ariaLabel: 'Borrar toda la expresión', kind: 'ctrl', action: { type: 'clear' } },
  ]
}

export interface ExampleChip {
  id: string
  label: string
  latex: string
}

export function buildExamples(v: string): ExampleChip[] {
  return [
    { id: 'square', label: `${v}²`, latex: `${v}^{2}` },
    { id: 'sin', label: `sin(${v})`, latex: `\\sin\\left(${v}\\right)` },
    { id: 'pi-square', label: `π·${v}²`, latex: `\\pi\\cdot ${v}^{2}` },
    { id: 'quotient', label: `(${v}² + 1)/√${v}`, latex: `\\frac{${v}^{2}+1}{\\sqrt{${v}}}` },
    { id: 'exp', label: `e${v === 'x' ? 'ˣ' : '^' + v}`, latex: `e^{${v}}` },
  ]
}
