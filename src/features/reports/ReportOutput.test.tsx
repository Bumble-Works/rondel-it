import { renderWithQuery as render } from '../../test/queryTestUtils'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { reportFixture, reportFixtureTags as tags, reportFixtureTask as task } from '../../test/reportFixtures'
import { PrintDocument } from '../print/PrintDocument'
import { printPage } from '../print/printPage'
import { downloadReportCsv } from './downloadReportCsv'
import { ReportPrint } from './ReportPrint'
import { ReportTaskTable } from './ReportTaskTable'

vi.mock('../print/printPage', () => ({ printPage: vi.fn(async () => {}) }))
vi.mock('./downloadReportCsv', () => ({ downloadReportCsv: vi.fn(async () => {}) }))

beforeEach(() => vi.clearAllMocks())

it('prints all matching sorted rows across pages, follows Show notes and exports full notes independently', async () => {
  const tasks = Array.from({ length: 56 }, (_, index) => task({ id: `task-${index}`, title: `Task ${String(index).padStart(2, '0')}`,
    status: index === 55 ? 'done' : 'todo', completedAt: index === 55 ? '2026-10-27T12:00:00Z' : null, note: `Note ${index}` }))
  const dashboard = reportFixture(tasks)
  const output = { range: dashboard.range, summary: 'October · All tags', title: 'Reports — Tasks', onError: vi.fn() }
  render(<ReportTaskTable rows={dashboard.rows} tags={tags} selection="october" output={output} />)
  fireEvent.click(screen.getByRole('button', { name: 'To do' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sort by Task' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(screen.getAllByRole('rowheader')).toHaveLength(5)
  expect(screen.queryByText('Note 0')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  await waitFor(() => expect(downloadReportCsv).toHaveBeenCalledOnce())
  const [rows, , range] = vi.mocked(downloadReportCsv).mock.calls[0]
  expect(rows).toHaveLength(55)
  expect(rows[0]).toMatchObject({ title: 'Task 00', note: 'Note 0' })
  expect(rows.at(-1)!.title).toBe('Task 54')
  expect(range).toEqual(dashboard.range)
  fireEvent.click(screen.getByRole('button', { name: 'Print' }))
  await waitFor(() => expect(printPage).toHaveBeenCalledOnce())
  const sheet = document.querySelector('.print-sheet[data-print-active]')!
  expect(sheet.querySelectorAll('tbody tr')).toHaveLength(55)
  expect(sheet).not.toHaveTextContent('Task 55')
  expect(sheet.querySelector('.report-task-note')).toBeNull()
  expect(sheet.querySelectorAll('button')).toHaveLength(0)
  expect(sheet.querySelector('.print-head')).toHaveTextContent('Status: To do · 55 tasks')
  act(() => { window.dispatchEvent(new Event('afterprint')) })
  expect(document.querySelector('.print-sheet')).toBeNull()
  expect(screen.getAllByRole('rowheader')).toHaveLength(5)
  expect(screen.getByText('51–55 of 55 tasks')).toBeVisible()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show notes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Print' }))
  await waitFor(() => expect(printPage).toHaveBeenCalledTimes(2))
  expect(document.querySelectorAll('.print-sheet .report-task-note')).toHaveLength(55)
})

it('disables empty exports but prints an explicit empty message', async () => {
  const output = { range: { start: '2026-10-01', end: '2026-10-31' }, summary: 'All tags', title: 'Reports — Tasks', onError: vi.fn() }
  render(<ReportTaskTable rows={[]} tags={tags} selection="empty" output={output} />)
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Print' }))
  await waitFor(() => expect(document.querySelector('.print-sheet')).toHaveTextContent('Nothing to print.'))
})

it('surfaces print failures, clears the document and allows retry', async () => {
  const failure = new Error('Printer unavailable')
  vi.mocked(printPage).mockRejectedValueOnce(failure)
  const onError = vi.fn()
  render(<ReportPrint title="Dashboard" summary="October" onError={onError} renderContent={() => <p>Chart content</p>} />)
  fireEvent.click(screen.getByRole('button', { name: 'Print' }))
  await waitFor(() => expect(onError).toHaveBeenCalledWith('Couldn’t print report', failure))
  expect(document.querySelector('.print-sheet')).toBeNull()
  expect(screen.getByRole('button', { name: 'Print' })).toBeEnabled()
})

it('activates only the requested print document even with an earlier board sheet mounted', async () => {
  const { rerender } = render(<>
    <PrintDocument key="board-1" title="Board" summary="A day"><p>Board tasks</p></PrintDocument>
    <ReportPrint title="Dashboard" summary="October" onError={vi.fn()} renderContent={() => <p>Charts</p>} />
  </>)
  fireEvent.click(screen.getByRole('button', { name: 'Print' }))
  await waitFor(() => expect(printPage).toHaveBeenCalled())
  expect(document.querySelectorAll('.print-sheet')).toHaveLength(2)
  expect(document.querySelectorAll('.print-sheet[data-print-active]')).toHaveLength(1)
  expect(document.querySelector('.print-sheet[data-print-active]')).toHaveTextContent('Charts')
  rerender(<PrintDocument key="board-2" title="Board again" summary="A week"><p>New board tasks</p></PrintDocument>)
  expect(document.querySelectorAll('.print-sheet[data-print-active]')).toHaveLength(1)
  expect(document.querySelector('.print-sheet[data-print-active]')).toHaveTextContent('New board tasks')
})

it('surfaces CSV save errors and re-enables the export action', async () => {
  const failure = new Error('Disk full')
  vi.mocked(downloadReportCsv).mockRejectedValueOnce(failure)
  const tasks = [task()]
  const dashboard = reportFixture(tasks)
  const onError = vi.fn()
  render(<ReportTaskTable rows={dashboard.rows} tags={tags} selection="october"
    output={{ range: dashboard.range, summary: 'All tags', title: 'Tasks', onError }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  await waitFor(() => expect(onError).toHaveBeenCalledWith('Couldn’t export report CSV', failure))
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
})
