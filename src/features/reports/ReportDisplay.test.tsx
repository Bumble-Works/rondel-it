import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react'
import { renderWithQuery as render } from '../../test/queryTestUtils'
import { reportFixtureTask as task } from '../../test/reportFixtures'
import { buildDashboard } from '../../domain/reports'
import type { ReportRange } from '../../domain/reportTypes'
import type { DataSource } from '../../services/adapters/DataSource'
import { printPage } from '../print/printPage'
import { ReportsPage } from './ReportsPage'
import { useDashboardDisplay } from './useDashboardDisplay'

vi.mock('@nivo/pie', () => ({ Pie: () => <svg width={240} height={210} /> }))
vi.mock('@nivo/bar', () => ({ Bar: () => <svg width={540} height={190} /> }))
vi.mock('@nivo/calendar', () => ({ Calendar: () => <svg width={900} height={175} /> }))
vi.mock('../print/printPage', () => ({ printPage: vi.fn(async () => {}) }))
vi.mock('../../domain/reports', async (importOriginal) => {
  const reports = await importOriginal<typeof import('../../domain/reports')>()
  return { ...reports, buildDashboard: vi.fn(reports.buildDashboard) }
})

it('retains dashboard choices across tabs and prints that selection without reloading or recalculating', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))
  const listAllTasks = vi.fn(async () => [
    task({ id: 'last-year', dayDate: '2025-12-31', originDate: '2025-12-31', createdAt: '2025-12-31T08:00:00Z' }),
    task({ id: 'this-year', dayDate: '2026-01-01', originDate: '2026-01-01', createdAt: '2026-01-01T08:00:00Z' }),
  ])
  render(<ReportsPage dataSource={{ listAllTasks } as unknown as DataSource} tags={[]} onBack={() => {}} onError={vi.fn()} />)
  await screen.findByRole('button', { name: /^Your little wins/ })
  fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'custom' } })
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-12-20' } })
  fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-01-10' } })
  const calculations = vi.mocked(buildDashboard).mock.calls.length

  fireEvent.change(screen.getByRole('combobox', { name: 'Year' }), { target: { value: '2025' } })
  fireEvent.click(screen.getByRole('button', { name: 'To do' }))
  fireEvent.click(screen.getByRole('button', { name: /^Where your list stands/ }))
  fireEvent.click(screen.getByRole('tab', { name: 'Tasks' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Dashboard' }))
  expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2025')
  expect(screen.getByRole('button', { name: 'To do' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: /^Where your list stands/ })).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Print' }))
  await waitFor(() => expect(printPage).toHaveBeenCalled())
  const sheet = document.querySelector('.print-sheet[data-print-active]')!
  expect(sheet.querySelector('.completion-calendar-head')).toHaveTextContent('in 2025')
  expect(sheet.querySelector('[data-series="todo"]')).toBeNull()
  expect(sheet.querySelector('.report-summary-chart')).toHaveClass('is-collapsed')
  expect(sheet.querySelector('[role="tooltip"]')).toBeNull()

  fireEvent.change(screen.getByRole('combobox', { name: 'Year' }), { target: { value: '2026' } })
  expect(sheet.querySelector('.completion-calendar-head')).toHaveTextContent('in 2025')
  expect(listAllTasks).toHaveBeenCalledTimes(1)
  expect(buildDashboard).toHaveBeenCalledTimes(calculations)
  act(() => window.dispatchEvent(new Event('afterprint')))
  expect(document.querySelector('.print-sheet')).toBeNull()
})

it('clamps the displayed year to the range while retaining the preferred year for a wider range', () => {
  const { result, rerender } = renderHook(({ range }: { range: ReportRange | null }) => useDashboardDisplay(range, '2026-10-27'), {
    initialProps: { range: { start: '2025-12-20', end: '2026-01-10' } as ReportRange | null },
  })
  act(() => result.current.setCalendarYear(2025))
  rerender({ range: { start: '2026-01-01', end: '2026-01-10' } })
  expect(result.current.calendarYear).toBe(2026)
  rerender({ range: null })
  expect(result.current.calendarYear).toBe(2025)
  rerender({ range: { start: '2025-12-20', end: '2026-01-10' } })
  expect(result.current.calendarYear).toBe(2025)
})
