import { renderWithQuery as render } from '../../test/queryTestUtils'
import { fireEvent, screen, within } from '@testing-library/react'
import type { DataSource } from '../../services/adapters/DataSource'
import type { Dashboard } from '../../domain/reportTypes'
import { reportFixtureTags as tags, reportFixtureTask as task } from '../../test/reportFixtures'
import { ReportsPage } from './ReportsPage'

vi.mock('./ReportOverview', async () => {
  const { ReportHighlights } = await import('./ReportHighlights')
  return { ReportOverview: ({ dashboard, onLeftBehind }: { dashboard: Dashboard; onLeftBehind: () => void }) => <>
    <p>Dashboard summary</p><ReportHighlights dashboard={dashboard} onLeftBehind={onLeftBehind} />
  </> }
})

it('shares any/all tag filtering between Dashboard and Tasks without a separate review view', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))
  const dataSource = { listAllTasks: vi.fn(async () => [
    task({ id: 'work', title: 'Work achievement', tagIds: ['work'], status: 'done', completedAt: '2026-10-26T12:00:00Z', note: 'Ready for review' }),
    task({ id: 'both', title: 'Shared task', tagIds: ['work', 'health'] }),
    task({ id: 'other', title: 'Other work' }),
    task({ id: 'cancel', title: 'Let go', tagIds: ['work'], status: 'canceled', canceledAt: '2026-10-27T12:00:00Z' }),
  ]) } as unknown as DataSource
  render(<ReportsPage dataSource={dataSource} tags={[...tags, { id: 'health', name: 'Health', color: '#16b98a' }]} onBack={() => {}} onError={vi.fn()} />)
  await screen.findByText('Dashboard summary')
  expect(screen.queryByRole('tab', { name: 'Meeting review' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '#Work' }))
  const dashboard = screen.getByRole('tab', { name: 'Dashboard' })
  dashboard.focus()
  fireEvent.keyDown(dashboard, { key: 'ArrowRight' })
  expect(screen.getByRole('tab', { name: 'Tasks' })).toHaveFocus()
  const table = screen.getByRole('table', { name: 'Tasks' })
  expect(within(table).getAllByRole('rowheader')).toHaveLength(3)
  expect(screen.queryByText('Other work')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '#Health' }))
  fireEvent.change(screen.getByLabelText('Match'), { target: { value: 'all' } })
  expect(within(table).getAllByRole('rowheader')).toHaveLength(1)
  expect(within(table).getByText('Shared task')).toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'Dashboard' }))
  expect(screen.getByRole('button', { name: '#Work' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByLabelText('Match')).toHaveValue('all')
  fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'this-month' } })
  fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'custom' } })
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })
  fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-12-31' } })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(dataSource.listAllTasks).toHaveBeenCalledTimes(1)
})

it('opens only filtered left-behind tasks, supports opening one for action, and can restore the full list', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))
  const past = task({ id: 'past', title: 'Call the dentist', dayDate: '2026-10-20', tagIds: ['work'] })
  const dataSource = { listAllTasks: vi.fn(async () => [past,
    task({ id: 'today', title: 'Today work', tagIds: ['work'] }),
    task({ id: 'personal', title: 'Other past work', dayDate: '2026-10-20' }),
    task({ id: 'doing', title: 'Already started', status: 'doing', dayDate: '2026-10-20', tagIds: ['work'] }),
  ]) } as unknown as DataSource
  const onOpenTask = vi.fn()
  render(<ReportsPage dataSource={dataSource} tags={tags} onBack={() => {}} onError={vi.fn()} onOpenTask={onOpenTask} />)
  await screen.findByText('Dashboard summary')
  fireEvent.click(screen.getByRole('button', { name: '#Work' }))
  fireEvent.click(screen.getByRole('button', { name: 'Show 1 task left behind' }))
  expect(screen.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('heading', { name: 'Left behind' })).toBeVisible()
  expect(screen.getAllByRole('rowheader')).toHaveLength(1)
  expect(screen.getByText('Call the dentist')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Open Call the dentist' }))
  expect(onOpenTask).toHaveBeenCalledWith(past)
  fireEvent.click(screen.getByRole('button', { name: 'Show all tasks' }))
  expect(screen.getAllByRole('rowheader')).toHaveLength(3)
})

it('shows a load error and reconnects the retry action to the shared data load', async () => {
  const failure = new Error('Cannot read saved tasks')
  const listAllTasks = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce([task()])
  const dataSource = { listAllTasks } as unknown as DataSource
  const onError = vi.fn()
  render(<ReportsPage dataSource={dataSource} tags={tags} onBack={() => {}} onError={onError} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot read saved tasks')
  expect(onError).toHaveBeenCalledWith('Unable to load reports', failure)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Dashboard summary')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(listAllTasks).toHaveBeenCalledTimes(2)
})

it('makes Print unavailable during loading, after a load failure and for invalid dates', async () => {
  let rejectLoad: (error: Error) => void = () => {}
  const loading = new Promise<never>((_, reject) => { rejectLoad = reject })
  const listAllTasks = vi.fn().mockReturnValueOnce(loading).mockResolvedValueOnce([task()])
  render(<ReportsPage dataSource={{ listAllTasks } as unknown as DataSource} tags={tags} onBack={() => {}} onError={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
  rejectLoad(new Error('Cannot load tasks'))
  await screen.findByRole('alert')
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Dashboard summary')
  expect(screen.getByRole('button', { name: 'Print' })).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'custom' } })
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-01-01' } })
  fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-10-27' } })
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled()
})
