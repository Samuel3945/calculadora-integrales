import katex from 'katex'
import { useMemo } from 'react'

interface KatexMathProps {
  latex: string
  display?: boolean
  className?: string
  /** Shown when KaTeX cannot render the string (never throws). */
  fallback?: string
}

/**
 * Renders LaTeX with KaTeX. `trust: false` and `strict: 'ignore'` keep untrusted strings inert
 * (no \href/\url/\includegraphics), and failures degrade to plain text instead of throwing.
 */
export function KatexMath({ latex, display = false, className, fallback }: KatexMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode: display, throwOnError: true, trust: false, strict: 'ignore' })
    } catch {
      return null
    }
  }, [latex, display])

  if (html === null) return <span className={className}>{fallback ?? latex}</span>
  // KaTeX output is generated markup with trust disabled.
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
