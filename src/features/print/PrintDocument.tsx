import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './PrintDocument.css'

interface PrintDocumentProps {
  title: string
  summary: string
  className?: string
  children: ReactNode
}

/** Only the most recently requested document participates in printing. */
export function PrintDocument({ title, summary, className = '', children }: PrintDocumentProps) {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    document.querySelectorAll('.print-sheet[data-print-active]').forEach((sheet) => sheet.removeAttribute('data-print-active'))
    root.current?.setAttribute('data-print-active', '')
    // Fixed-size chart SVGs need a viewBox to scale to paper without cropping.
    root.current?.querySelectorAll('svg[width][height]:not([viewBox])').forEach((svg) => {
      const width = Number(svg.getAttribute('width')), height = Number(svg.getAttribute('height'))
      if (width > 0 && height > 0) svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    })
  }, [])
  return createPortal(
    <section ref={root} className={`print-sheet ${className}`.trim()} aria-hidden="true">
      <header className="print-head"><h1>{title}</h1><p>{summary}</p></header>
      {children}
    </section>, document.body,
  )
}
