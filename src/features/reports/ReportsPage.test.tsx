import { fireEvent, render, screen, within } from '@testing-library/react'
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
  render(<ReportsPage dataSource={dataSource} tags={[...tags, { id: 'health', name: 'Health', color: '#16b98a' }]} revision={0} onBack={() => {}} onError={vi.fn()} />)
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
  render(<ReportsPage dataSource={dataSource} tags={tags} revision={0} onBack={() => {}} onError={vi.fn()} onOpenTask={onOpenTask} />)
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
