/**
 * Whitelisted converter: LaTeX emitted by MathLive -> canonical syntax of the API contract.
 *
 * Design: the LaTeX is tokenised and parsed with a small recursive-descent parser that only knows the
 * constructs below. Anything else is rejected with a Spanish message; arbitrary LaTeX is NEVER
 * passed through to the server.
 *
 * Accepted: digits and decimal point, the integration variable, \pi, e / \exponentialE, + - * / \cdot \times
 * \div, ^ (braced or single token), \frac{}{}, \sqrt{}, \left( \right), ( ), \left| \right|, | |,
 * \sin \cos \tan \sinh \cosh \tanh, \arcsin \arccos \arctan (also \sin^{-1} ...), \ln, \log, \exp, and
 * f^{n} for function powers. Implicit multiplication is made explicit.
 *
 * Conventions (documented in the README):
 *  - `\ln` and `\log` both map to the contract's `log`, the NATURAL logarithm.
 *  - e^{...} becomes exp(...); a bare e becomes E.
 *  - A function without parentheses takes the following run of implicitly multiplied factors:
 *    `\sin 2x` -> sin(2*x) and `\sin x\cos x` -> sin(x)*cos(x).
 */

export type ConversionResult = { ok: true; canonical: string } | { ok: false; message: string }

export interface ConvertOptions {
  /** Integration variable: a single ASCII letter other than e / E. Defaults to `x`. */
  variable?: string
}

class ConversionError extends Error {}

type TokenKind =
  | 'digit'
  | 'dot'
  | 'letter'
  | 'cmd'
  | 'plus'
  | 'minus'
  | 'star'
  | 'slash'
  | 'caret'
  | 'lparen'
  | 'rparen'
  | 'labs'
  | 'rabs'
  | 'bar'
  | 'lbrace'
  | 'rbrace'
  | 'lbracket'
  | 'rbracket'

interface Token {
  kind: TokenKind
  value: string
  raw: string
}

const FUNCTIONS: Record<string, string> = {
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  arcsin: 'asin',
  arccos: 'acos',
  arctan: 'atan',
  asin: 'asin',
  acos: 'acos',
  atan: 'atan',
  ln: 'log',
  log: 'log',
  exp: 'exp',
}

const INVERSE: Record<string, string> = { sin: 'asin', cos: 'acos', tan: 'atan' }

const SPACING_COMMANDS = new Set(['quad', 'qquad', 'thinspace', 'medspace', 'thickspace', 'negthinspace', 'enspace'])

const MAX_DEPTH = 80

function fail(message: string): never {
  throw new ConversionError(message)
}

const failUnknownCommand = (name: string): never =>
  fail(`Esa notación no está admitida: \\${name}. Usa números, la variable, π, e, operadores y las funciones del teclado.`)

function readBraced(source: string, start: number): { content: string; end: number } | null {
  if (source[start] !== '{') return null
  const close = source.indexOf('}', start)
  if (close === -1) return null
  return { content: source.slice(start + 1, close), end: close + 1 }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const push = (kind: TokenKind, value: string, raw: string) => tokens.push({ kind, value, raw })

  while (i < source.length) {
    const c = source.charAt(i)

    if (/\s/.test(c) || c === '~') {
      i += 1
      continue
    }

    if (c === '\\') {
      const next = source.charAt(i + 1)
      if (' ,;:!'.includes(next) && next !== '') {
        i += 2
        continue
      }
      const nameMatch = /^[a-zA-Z]+/.exec(source.slice(i + 1))
      if (!nameMatch) fail('Esa notación no está admitida. Usa solo los símbolos del teclado.')
      const name = (nameMatch as RegExpExecArray)[0]
      i += 1 + name.length

      if (SPACING_COMMANDS.has(name)) continue

      if (name === 'left' || name === 'right') {
        const isLeft = name === 'left'
        while (/\s/.test(source.charAt(i))) i += 1
        let delimiter = source.charAt(i)
        if (delimiter === '\\') {
          const dm = /^[a-zA-Z]+/.exec(source.slice(i + 1))
          delimiter = dm ? `\\${dm[0]}` : ''
          i += 1 + (dm ? dm[0].length : 0)
        } else {
          i += 1
        }
        if (delimiter === '(' || delimiter === '\\lparen' || delimiter === ')' || delimiter === '\\rparen') {
          const opening = delimiter === '(' || delimiter === '\\lparen'
          if (opening !== isLeft) fail('Los paréntesis no están bien emparejados.')
          push(isLeft ? 'lparen' : 'rparen', delimiter, `\\${name}${delimiter}`)
        } else if (delimiter === '|' || delimiter === '\\lvert' || delimiter === '\\rvert' || delimiter === '\\vert') {
          push(isLeft ? 'labs' : 'rabs', '|', `\\${name}|`)
        } else {
          fail('Ese tipo de delimitador no está admitido; usa paréntesis o barras de valor absoluto.')
        }
        continue
      }

      if (name === 'mathrm' || name === 'operatorname') {
        const braced = readBraced(source, i)
        if (!braced) fail('Esa notación no está admitida.')
        const group = braced as { content: string; end: number }
        i = group.end
        const content = group.content.trim()
        if (name === 'mathrm' && content === 'e') {
          push('cmd', 'exponentialE', '\\mathrm{e}')
        } else if (name === 'operatorname' && (content in FUNCTIONS || content === 'abs')) {
          push('cmd', content, `\\operatorname{${content}}`)
        } else {
          fail(`Esa notación no está admitida: ${content || 'vacía'}.`)
        }
        continue
      }

      if (name === 'cdot' || name === 'times' || name === 'ast') push('star', '*', `\\${name}`)
      else if (name === 'div') push('slash', '/', '\\div')
      else if (name === 'lvert') push('labs', '|', '\\lvert')
      else if (name === 'rvert') push('rabs', '|', '\\rvert')
      else if (name === 'vert') push('bar', '|', '\\vert')
      else if (name === 'lparen') push('lparen', '(', '\\lparen')
      else if (name === 'rparen') push('rparen', ')', '\\rparen')
      else if (name === 'placeholder') fail('Completa los espacios vacíos de la expresión.')
      else push('cmd', name, `\\${name}`)
      continue
    }

    if (source.startsWith('{,}', i)) {
      push('dot', '.', '{,}')
      i += 3
      continue
    }

    if (c >= '0' && c <= '9') push('digit', c, c)
    else if (c === '.') push('dot', '.', c)
    else if (/[a-zA-Z]/.test(c)) push('letter', c, c)
    else if (c === '+') push('plus', '+', c)
    else if (c === '-' || c === '−') push('minus', '-', c)
    else if (c === '*' || c === '×' || c === '·' || c === '⋅') push('star', '*', c)
    else if (c === '/' || c === '÷') push('slash', '/', c)
    else if (c === '^') push('caret', '^', c)
    else if (c === '(') push('lparen', '(', c)
    else if (c === ')') push('rparen', ')', c)
    else if (c === '|') push('bar', '|', c)
    else if (c === '{') push('lbrace', '{', c)
    else if (c === '}') push('rbrace', '}', c)
    else if (c === '[') push('lbracket', '[', c)
    else if (c === ']') push('rbracket', ']', c)
    else if (c === 'π') push('cmd', 'pi', c)
    else if (c === '√') push('cmd', 'sqrt', c)
    else if (c === '_') fail('Los subíndices no están admitidos.')
    else fail(`Carácter no admitido: «${c}».`)
    i += 1
  }
  return tokens
}

/* Precedence levels used to decide where parentheses are required in the output. */
const ADD = 1
const MUL = 2
const UNARY = 3
const POW = 4
const ATOM = 5

interface Node {
  code: string
  prec: number
  /** True for the constant e, so e^{...} can be emitted as exp(...). */
  isEuler?: boolean
}

const wrap = (n: Node): string => `(${n.code})`
const maybeWrap = (n: Node, needed: boolean): string => (needed ? wrap(n) : n.code)

function multiply(left: Node, right: Node): Node {
  return { code: `${maybeWrap(left, left.prec < MUL)}*${maybeWrap(right, right.prec < POW)}`, prec: MUL }
}

function divide(left: Node, right: Node): Node {
  return { code: `${maybeWrap(left, left.prec < MUL)}/${maybeWrap(right, right.prec <= MUL || right.prec === UNARY)}`, prec: MUL }
}

class Parser {
  private pos = 0
  private depth = 0
  private plainAbs = 0

  constructor(
    private readonly tokens: Token[],
    private readonly variable: string,
  ) {}

  parse(): string {
    const node = this.parseExpression()
    const rest = this.peek()
    if (rest) {
      if (rest.kind === 'rparen') fail('Hay un paréntesis de cierre sin su paréntesis de apertura.')
      if (rest.kind === 'rbrace') fail('La expresión tiene una llave de cierre sin abrir.')
      fail(`No se esperaba «${rest.raw}» en esa posición.`)
    }
    return node.code
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset]
  }

  private next(): Token {
    const token = this.tokens[this.pos]
    if (!token) fail('La expresión está incompleta.')
    this.pos += 1
    return token as Token
  }

  private expect(kind: TokenKind, message: string): void {
    const token = this.peek()
    if (!token || token.kind !== kind) fail(message)
    this.pos += 1
  }

  private enter(): void {
    this.depth += 1
    if (this.depth > MAX_DEPTH) fail('La expresión es demasiado compleja.')
  }

  private leave(): void {
    this.depth -= 1
  }

  private parseExpression(): Node {
    this.enter()
    let left = this.parseTerm()
    for (;;) {
      const token = this.peek()
      if (!token || (token.kind !== 'plus' && token.kind !== 'minus')) break
      this.pos += 1
      const right = this.parseTerm()
      const minus = token.kind === 'minus'
      const wrapRight = right.prec === UNARY || (minus && right.prec <= ADD)
      left = { code: `${left.code}${minus ? '-' : '+'}${maybeWrap(right, wrapRight)}`, prec: ADD }
    }
    this.leave()
    return left
  }

  private startsOperand(token: Token | undefined, allowFunctions: boolean): boolean {
    if (!token) return false
    switch (token.kind) {
      case 'digit':
      case 'dot':
      case 'letter':
      case 'lparen':
      case 'labs':
        return true
      case 'bar':
        return this.plainAbs === 0
      case 'cmd':
        return allowFunctions || !(token.value in FUNCTIONS || token.value === 'abs')
      default:
        return false
    }
  }

  private parseTerm(): Node {
    let left = this.parseUnary()
    for (;;) {
      const token = this.peek()
      if (!token) break
      if (token.kind === 'star') {
        this.pos += 1
        left = multiply(left, this.parseUnary())
      } else if (token.kind === 'slash') {
        this.pos += 1
        left = divide(left, this.parseUnary())
      } else if (this.startsOperand(token, true)) {
        left = multiply(left, this.parsePower())
      } else {
        break
      }
    }
    return left
  }

  private parseUnary(): Node {
    const token = this.peek()
    if (token?.kind === 'plus') {
      this.pos += 1
      return this.parseUnary()
    }
    if (token?.kind === 'minus') {
      this.pos += 1
      this.enter()
      const operand = this.parseUnary()
      this.leave()
      return { code: `-${maybeWrap(operand, operand.prec < POW)}`, prec: UNARY }
    }
    return this.parsePower()
  }

  private parsePower(): Node {
    const base = this.parsePrimary()
    if (this.peek()?.kind !== 'caret') return base
    this.pos += 1
    const exponent = this.parseExponent()
    if (this.peek()?.kind === 'caret') fail('Usa llaves o paréntesis para encadenar potencias, por ejemplo x^{y^2}.')
    if (base.isEuler) return { code: `exp(${exponent.code})`, prec: ATOM }
    const exponentCode = exponent.prec === ATOM ? exponent.code : wrap(exponent)
    return { code: `${maybeWrap(base, base.prec <= POW)}**${exponentCode}`, prec: POW }
  }

  /** Superscript content: `{expr}` or exactly one token (LaTeX semantics of x^2). */
  private parseExponent(): Node {
    if (this.peek()?.kind === 'lbrace') {
      this.pos += 1
      const inner = this.parseExpression()
      this.expect('rbrace', 'Falta cerrar la llave del exponente.')
      return inner
    }
    return this.parseSingle()
  }

  private parseArgument(): Node {
    if (this.peek()?.kind === 'lbrace') {
      this.pos += 1
      const inner = this.parseExpression()
      this.expect('rbrace', 'Falta cerrar una llave.')
      return inner
    }
    return this.parseSingle()
  }

  private parseSingle(): Node {
    const token = this.next()
    if (token.kind === 'digit') return { code: token.value, prec: ATOM }
    if (token.kind === 'letter') return this.symbol(token)
    if (token.kind === 'cmd' && token.value === 'pi') return { code: 'pi', prec: ATOM }
    if (token.kind === 'cmd' && token.value === 'exponentialE') return { code: 'E', prec: ATOM, isEuler: true }
    if (token.kind === 'minus') fail('Escribe los exponentes negativos entre llaves, por ejemplo x^{-1}.')
    return fail('Falta un valor en el exponente, la fracción o la raíz.')
  }

  private symbol(token: Token): Node {
    if (token.value === this.variable) return { code: this.variable, prec: ATOM }
    if (token.value === 'e') return { code: 'E', prec: ATOM, isEuler: true }
    return fail(
      `Símbolo no admitido: «${token.value}». Usa la variable «${this.variable}», π, e y los números.`,
    )
  }

  private parseNumber(): Node {
    let integer = ''
    let fraction = ''
    while (this.peek()?.kind === 'digit') integer += this.next().value
    if (this.peek()?.kind === 'dot') {
      this.pos += 1
      while (this.peek()?.kind === 'digit') fraction += this.next().value
      if (integer === '' && fraction === '') fail('Número mal formado.')
    }
    if (this.peek()?.kind === 'dot') fail('Número mal formado: tiene dos puntos decimales.')
    return { code: `${integer || '0'}${fraction ? `.${fraction}` : ''}`, prec: ATOM }
  }

  private parsePrimary(): Node {
    const token = this.peek()
    if (!token) return fail('La expresión está incompleta.')

    switch (token.kind) {
      case 'digit':
      case 'dot':
        return this.parseNumber()
      case 'letter':
        this.pos += 1
        return this.symbol(token)
      case 'lparen': {
        this.pos += 1
        this.enter()
        const inner = this.parseExpression()
        this.leave()
        this.expect('rparen', 'Falta cerrar un paréntesis.')
        return { code: `(${inner.code})`, prec: ATOM }
      }
      case 'lbrace': {
        this.pos += 1
        const inner = this.parseExpression()
        this.expect('rbrace', 'Falta cerrar una llave.')
        return { code: `(${inner.code})`, prec: ATOM }
      }
      case 'labs': {
        this.pos += 1
        this.enter()
        const inner = this.parseExpression()
        this.leave()
        this.expect('rabs', 'Falta cerrar el valor absoluto.')
        return { code: `abs(${inner.code})`, prec: ATOM }
      }
      case 'bar': {
        this.pos += 1
        this.plainAbs += 1
        this.enter()
        const inner = this.parseExpression()
        this.leave()
        this.plainAbs -= 1
        this.expect('bar', 'Falta cerrar el valor absoluto.')
        return { code: `abs(${inner.code})`, prec: ATOM }
      }
      case 'cmd':
        return this.parseCommand(token)
      case 'rparen':
        return fail('Hay un paréntesis de cierre sin su paréntesis de apertura.')
      case 'lbracket':
        return fail('Solo se admite la raíz cuadrada (√). Para otras raíces usa potencias, por ejemplo x^{1/3}.')
      default:
        return fail(`No se esperaba «${token.raw}» en esa posición.`)
    }
  }

  private parseCommand(token: Token): Node {
    this.pos += 1
    const name = token.value
    switch (name) {
      case 'pi':
        return { code: 'pi', prec: ATOM }
      case 'exponentialE':
        return { code: 'E', prec: ATOM, isEuler: true }
      case 'frac':
      case 'dfrac':
      case 'tfrac': {
        const numerator = this.parseArgument()
        const denominator = this.parseArgument()
        return divide(numerator, denominator)
      }
      case 'sqrt': {
        if (this.peek()?.kind === 'lbracket') {
          return fail('Solo se admite la raíz cuadrada (√). Para otras raíces usa potencias, por ejemplo x^{1/3}.')
        }
        const argument = this.parseArgument()
        return { code: `sqrt(${argument.code})`, prec: ATOM }
      }
      case 'abs':
        return this.parseFunctionCall('abs', 'abs')
      default:
        if (name in FUNCTIONS) return this.parseFunctionCall(name, FUNCTIONS[name] as string)
        return failUnknownCommand(name)
    }
  }

  private parseFunctionCall(latexName: string, canonicalName: string): Node {
    let functionName = canonicalName
    let exponent: Node | null = null

    if (this.peek()?.kind === 'caret') {
      this.pos += 1
      exponent = this.parseExponent()
      if (exponent.code === '-1') {
        const inverse = INVERSE[latexName]
        if (!inverse) fail('El exponente −1 solo se admite en sin, cos y tan (función inversa).')
        functionName = inverse as string
        exponent = null
      }
    }

    let argumentCode: string
    if (this.peek()?.kind === 'lparen') {
      this.pos += 1
      this.enter()
      const inner = this.parseExpression()
      this.leave()
      this.expect('rparen', 'Falta cerrar un paréntesis.')
      argumentCode = inner.code
    } else {
      if (!this.startsOperand(this.peek(), true) && this.peek()?.kind !== 'minus' && this.peek()?.kind !== 'plus') {
        fail(`Falta el argumento de la función ${latexName}.`)
      }
      let chain = this.parseUnary()
      while (this.startsOperand(this.peek(), false)) chain = multiply(chain, this.parsePower())
      argumentCode = chain.code
    }

    const call = `${functionName}(${argumentCode})`
    if (!exponent) return { code: call, prec: ATOM }
    const exponentCode = exponent.prec === ATOM ? exponent.code : wrap(exponent)
    return { code: `${call}**${exponentCode}`, prec: POW }
  }
}

export function isValidVariable(variable: string): boolean {
  return /^[a-df-zA-DF-Z]$/.test(variable)
}

export function latexToCanonical(latex: string, options: ConvertOptions = {}): ConversionResult {
  const variable = options.variable ?? 'x'
  if (!isValidVariable(variable)) {
    return { ok: false, message: 'La variable debe ser una sola letra distinta de e.' }
  }
  try {
    const tokens = tokenize(latex)
    if (tokens.length === 0) return { ok: false, message: 'Escribe una función para continuar.' }
    const canonical = new Parser(tokens, variable).parse()
    return { ok: true, canonical }
  } catch (error) {
    if (error instanceof ConversionError) return { ok: false, message: error.message }
    throw error
  }
}
