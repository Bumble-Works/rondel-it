import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithQuery as render } from '../../test/queryTestUtils'
import { reportFixtureTask as task } from '../../test/reportFixtures'
import { toIso } from '../../domain/dates'
import type { DataSource } from '../../services/adapters/DataSource'
import { ReportsPage } from './ReportsPage'

vi.mock('@nivo/pie', () => ({ Pie: () => null }))
vi.mock('@nivo/bar', () => ({ Bar: () => null }))
vi.mock('@nivo/calendar', () => ({ Calendar: ({ data }: { data: unknown }) => <pre data-testid="calendar-data">{JSON.stringify(data)}</pre> }))

it('shows January and November completions regardless of Period and keeps the annual selection', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 4, 12))
  const listAllTasks = vi.fn(async () => ['2026-01-15', '2026-11-03', '2024-02-29'].map((date, i) => task({
    id: String(i), tagIds: i === 0 ? ['work', 'home'] : ['home'], dayDate: date, originDate: date, status: 'done', completedAt: `${date}T12:00:00Z`,
  })))
  render(<ReportsPage dataSource={{ listAllTasks } as unknown as DataSource} tags={[{ id: 'work', name: 'Work', color: '#000' }, { id: 'home', name: 'Home', color: '#fff' }]} onBack={vi.fn()} onError={vi.fn()} />)
  await screen.findByRole('img', { name: '2 tasks completed in 2026' })
  expect(screen.getByTestId('calendar-data')).toHaveTextContent('2026-01-15')
  expect(screen.getByTestId('calendar-data')).toHaveTextContent('2026-11-03')
  fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'last-month' } })
  expect(screen.getByRole('img', { name: '2 tasks completed in 2026' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } })
  await waitFor(() => expect(screen.getByRole('img', { name: '1 tasks completed in 2024' })).toBeInTheDocument())
  expect(screen.getByTestId('calendar-data')).toHaveTextContent('2024-02-29')
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } })
  fireEvent.click(screen.getByRole('button', { name: '#Work' }))
  expect(screen.getByRole('img', { name: '1 tasks completed in 2026' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '#Home' }))
  expect(screen.getByRole('img', { name: '2 tasks completed in 2026' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Match'), { target: { value: 'all' } })
  expect(screen.getByRole('img', { name: '1 tasks completed in 2026' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } })
  expect(screen.getByRole('img', { name: '0 tasks completed in 2024' })).toBeInTheDocument()
  expect(listAllTasks).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it.each([
  ['2025-01-01T00:30:00+14:00', '2025-01-01'],
  ['2024-12-31T23:30:00-12:00', '2024-12-31'],
])('offers the local completion year for %s', async (completedAt, scheduledDay) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 4, 12))
  const completedDay = toIso(new Date(completedAt))
  const year = completedDay.slice(0, 4)
  const listAllTasks = vi.fn(async () => [task({
    id: 'year-boundary', status: 'done', dayDate: scheduledDay, originDate: scheduledDay,
    createdAt: completedAt, completedAt,
  })])
  render(<ReportsPage dataSource={{ listAllTasks } as unknown as DataSource} tags={[]} onBack={vi.fn()} onError={vi.fn()} />)
  await screen.findByLabelText('Year')
  expect(screen.queryByRole('option', { name: year })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: year } })
  expect(screen.getByRole('img', { name: `1 tasks completed in ${year}` })).toBeInTheDocument()
  expect(JSON.parse(screen.getByTestId('calendar-data').textContent!)).toEqual([{ day: completedDay, value: 1 }])
})
