import { useState } from 'react'

export const REPORT_PAGE_SIZE = 50

export function useReportPagination(total: number, selection: string) {
  const [requested, setRequested] = useState({ selection, page: 0 })
  const pageCount = Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE))
  const page = requested.selection === selection ? Math.min(requested.page, pageCount - 1) : 0
  const start = page * REPORT_PAGE_SIZE
  const end = Math.min(start + REPORT_PAGE_SIZE, total)
  const onPage = (next: number) => setRequested({ selection, page: Math.max(0, Math.min(next, pageCount - 1)) })
  return { total, page, pageCount, start, end, onPage }
}

export type ReportPagination = ReturnType<typeof useReportPagination>
