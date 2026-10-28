import { useEffect, useState, type ReactNode } from 'react'
import { PrintDocument } from '../print/PrintDocument'
import { printPage } from '../print/printPage'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import './ReportPrint.css'

interface ReportPrintProps {
  title: string
  summary: string
  disabled?: boolean
  renderContent: () => ReactNode
  onError: (context: string, error: unknown) => void
}

export function ReportPrint({ title, summary, disabled, renderContent, onError }: ReportPrintProps) {
  const [request, setRequest] = useState<{ title: string; summary: string; content: ReactNode } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!request) return
    let canceled = false
    let frame = 0
    const clear = () => { setRequest(null); setBusy(false) }
    window.addEventListener('afterprint', clear)
    const prepare = async () => {
      try {
        await document.fonts?.ready
        if (canceled) return
        frame = requestAnimationFrame(() => {
          void printPage().catch((error) => {
            if (!canceled) { onError('Couldn’t print report', error); setRequest(null) }
          }).finally(() => { if (!canceled) setBusy(false) })
        })
      } catch (error) {
        if (!canceled) { onError('Couldn’t prepare report for printing', error); clear() }
      }
    }
    void prepare()
    return () => { canceled = true; cancelAnimationFrame(frame); window.removeEventListener('afterprint', clear) }
  }, [request, onError])
  return <>
    <Button size="sm" disabled={disabled || busy} title={`Print ${title} or save as PDF`} onClick={() => {
      setBusy(true)
      setRequest({ title, summary, content: renderContent() })
    }}><Icon name="print" size={15} />Print</Button>
    {request && <PrintDocument title={request.title} summary={request.summary} className="report-print">{request.content}</PrintDocument>}
  </>
}
