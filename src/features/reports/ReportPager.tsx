import { Button } from '../../shared/ui/Button'
import type { ReportPagination } from './useReportPagination'
import './ReportPager.css'

interface ReportPagerProps {
  pagination: ReportPagination
  label: string
  unit: string
}

export function ReportPager({ pagination, label, unit }: ReportPagerProps) {
  const { total, page, pageCount, start, end, onPage } = pagination
  return (
    <nav className="report-pager" aria-label={label}>
      <p aria-live="polite">{total ? `${start + 1}–${end} of ${total}` : '0'} {unit}</p>
      {pageCount > 1 && <div>
        <Button size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous page</Button>
        <span>Page {page + 1} of {pageCount}</span>
        <Button size="sm" disabled={page === pageCount - 1} onClick={() => onPage(page + 1)}>Next page</Button>
      </div>}
    </nav>
  )
}
