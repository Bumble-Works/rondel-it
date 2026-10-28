import { fireEvent, render, screen, within } from '@testing-library/react'
import { buildDashboard } from '../../domain/reports'
import { reportFixture, reportFixtureTask as task, reportFixtureTags as tags } from '../../test/reportFixtures'
import { CompletionDonut } from './charts/CompletionDonut'
import { CompletionCalendar } from './charts/CompletionCalendar'
import { TagBars } from './charts/TagBars'
import { DurationSummary } from './DurationSummary'
import { ReportOverview } from './ReportOverview'
import { useDashboardDisplay } from './useDashboardDisplay'
import type { Dashboard } from '../../domain/reportTypes'
import { RondelOutcomes } from './charts/RondelOutcomes'
import { BucketActivity } from './charts/BucketActivity'

vi.mock('@nivo/pie', () => ({ Pie: ({ data }: { data: unknown }) => <div data-testid="pie-data">{JSON.stringify(data)}</div> }))
vi.mock('@nivo/bar', () => ({ Bar: ({ data, fill }: { data: unknown; fill?: unknown }) => <div data-testid="bar-data" data-fill={JSON.stringify(fill)}>{JSON.stringify(data)}</div> }))
vi.mock('@nivo/calendar', () => ({ Calendar: ({ data }: { data: unknown }) => <div data-testid="calendar-data">{JSON.stringify(data)}</div> }))

function Overview({ dashboard }: { dashboard: Dashboard }) {
  const display = useDashboardDisplay(dashboard.range, '2026-10-27')
  return <ReportOverview dashboard={dashboard} display={display} />
}

const chartData = (id: string) => JSON.parse(screen.getByTestId(id).textContent ?? 'null')

it('charts exclusive rondel outcomes as percentages with a useful empty state', () => {
  const { rerender } = render(<RondelOutcomes outcomes={{ total: 4, todo: 1, doing: 1, done: 1, canceled: 1 }} />)
  expect(chartData('pie-data').map((item: { value: number }) => item.value)).toEqual([1, 1, 1, 1])
  expect(screen.getAllByText('25%')).toHaveLength(4)
  rerender(<RondelOutcomes outcomes={{ total: 0, todo: 0, doing: 0, done: 0, canceled: 0 }} />)
  expect(screen.queryByTestId('pie-data')).not.toBeInTheDocument()
  expect(screen.getByText('Nothing has rolled forward yet.')).toBeVisible()
})

it('shows compact Bucket List counts and celebrates positive activity only', () => {
  const { rerender } = render(<BucketActivity activity={{ created: 3, actualized: 1 }} />)
  expect(screen.getAllByRole('definition').map((count) => count.textContent)).toEqual(['3', '1'])
  expect(screen.getByText('You’re making someday happen!')).toBeVisible()
  rerender(<BucketActivity activity={{ created: 3, actualized: 0 }} />)
  expect(screen.getByText('More to look forward to!')).toBeVisible()
  rerender(<BucketActivity activity={{ created: 0, actualized: 0 }} />)
  expect(screen.queryByText('More to look forward to!')).not.toBeInTheDocument()
  expect(screen.queryByText('You’re making someday happen!')).not.toBeInTheDocument()
})

it('keeps the Bucket List chart visible even without identifiable Bucket List history', () => {
  render(<Overview dashboard={reportFixture([])} />)
  const bucket = screen.getByRole('heading', { name: 'Bucket List' }).closest('section')!
  expect(bucket).toBeVisible()
  expect(within(bucket).getAllByRole('definition').map((count) => count.textContent)).toEqual(['0', '0'])
})

it('shows Doing beyond the current schedule and keeps the legacy period count plain', () => {
  const dashboard = reportFixture([
    task({ id: 'legacy', status: 'doing', originDate: '2026-10-01', dayDate: '2026-11-02', rondelCount: 14 }),
  ])
  render(<Overview dashboard={dashboard} />)
  const doing = screen.getByText('In progress', { selector: '.report-highlight > span' }).parentElement!
  const rondels = screen.getByText('Rondeled', { selector: '.report-highlight > span' }).parentElement!
  expect(doing.querySelector('strong')).toHaveTextContent('1')
  expect(rondels.querySelector('strong')).toHaveTextContent('0')
  expect(rondels).not.toHaveTextContent('Older moves aren’t dated')
})

it('charts the three scheduled statuses with the same denominator as the legend and keeps cancellations separate', () => {
  const dashboard = reportFixture([
    task({ id: 'todo' }), task({ id: 'doing', status: 'doing' }),
    task({ id: 'done', status: 'done', completedAt: '2026-10-27T12:00:00Z' }),
    task({ id: 'canceled', status: 'canceled', canceledAt: '2026-10-27T12:00:00Z' }),
    task({ id: 'waiting', rondeled: true }),
  ])
  render(<CompletionDonut summary={dashboard.summary} />)
  expect(chartData('pie-data')).toEqual([
    { id: 'To do', label: 'To do', value: 1, color: '#9271d4' },
    { id: 'In progress', label: 'In progress', value: 1, color: '#5486f5' },
    { id: 'Completed', label: 'Completed', value: 1, color: '#16b98a' },
  ])
  expect(screen.getByText('33%')).toBeVisible()
  expect(screen.queryByText(/1 of 3 scheduled tasks completed/)).not.toBeInTheDocument()
})

it('stacks dated list entries in tag colors and keeps postponed work out of status bars', () => {
  const dashboard = reportFixture([
    task({ id: 'done', tagIds: ['work'], status: 'done', completedAt: '2026-10-27T12:00:00Z', rondelCount: 2 }),
    task({ id: 'doing', status: 'doing', tagIds: ['work'], rondelCount: 3 }),
    task({ id: 'todo', tagIds: ['work'], dayDate: '2026-11-02' }),
    task({ id: 'canceled', tagIds: ['work'], status: 'canceled', dayDate: '2026-10-26' }),
  ])
  const { rerender } = render(<TagBars metrics={dashboard.tagMetrics} kind="completion" />)
  expect(chartData('bar-data')).toEqual([{ label: 'work', name: '#Work', done: 1, doing: 1, todo: 0, color: tags[0].color }])
  expect(JSON.parse(screen.getByTestId('bar-data').getAttribute('data-fill') ?? 'null'))
    .toEqual([{ match: { id: 'doing' }, id: expect.stringContaining('in-progress-lines') }])
  rerender(<TagBars metrics={dashboard.tagMetrics} kind="rondels" />)
  expect(chartData('bar-data')).toEqual([{ label: 'work', name: '#Work', value: 5, color: tags[0].color }])
  const outside = reportFixture([task({ tagIds: ['work'], status: 'done', dayDate: '2026-11-01', completedAt: '2026-11-01T12:00:00Z' })])
  rerender(<TagBars metrics={outside.tagMetrics} kind="completion" />)
  expect(screen.getByText('A little room for your next win.')).toBeVisible()
  expect(screen.queryByTestId('bar-data')).not.toBeInTheDocument()
  const zero = reportFixture([task({ tagIds: ['work'] })])
  rerender(<TagBars metrics={zero.tagMetrics} kind="rondels" />)
  expect(screen.getByText('Nothing has rolled forward yet.')).toBeVisible()
  expect(screen.queryByText('Work')).not.toBeInTheDocument()
})

it('builds duration buckets, average and median from recorded starts only, preserving same-day zero and coverage', () => {
  const dashboard = reportFixture([
    task({ id: 'same-day', status: 'done', dayDate: '2026-10-27', startedAt: '2026-10-27T09:00:00Z', completedAt: '2026-10-27T12:00:00Z' }),
    task({ id: 'two-days', status: 'done', startedAt: '2026-10-25T12:00:00Z', completedAt: '2026-10-27T12:00:00Z' }),
    task({ id: 'estimated', status: 'done', dayDate: '2026-10-01', completedAt: '2026-10-27T12:00:00Z' }),
  ])
  render(<DurationSummary duration={dashboard.durations.started} label="Since first started" />)
  expect(chartData('bar-data')).toEqual([
    { label: 'Same day', count: 1 }, { label: '1–2 days', count: 1 },
    { label: '3–7 days', count: 0 }, { label: '8–30 days', count: 0 }, { label: '31+ days', count: 0 },
  ])
  expect(screen.getAllByText('1 day')).toHaveLength(2)
  expect(screen.queryByText(/Known for/)).not.toBeInTheDocument()
})

it('keeps the calendar within its selected year and reports exact completion days when the period spans New Year', () => {
  const dashboard = buildDashboard([
    task({ id: 'last-year', status: 'done', dayDate: '2025-12-31', originDate: '2025-12-31', completedAt: '2025-12-31T12:00:00Z' }),
    task({ id: 'this-year', status: 'done', dayDate: '2026-01-01', originDate: '2026-01-01', completedAt: '2026-01-01T12:00:00Z' }),
  ], [], { start: '2025-12-20', end: '2026-01-10' })
  const onYearChange = vi.fn()
  const { rerender } = render(<CompletionCalendar dashboard={dashboard} year={2026} onYearChange={onYearChange} />)
  expect(chartData('calendar-data')).toEqual([{ day: '2026-01-01', value: 1 }])
  expect(screen.getByRole('img', { name: '1 tasks completed in 2026 within the selected period' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } })
  expect(onYearChange).toHaveBeenCalledWith(2025)
  rerender(<CompletionCalendar dashboard={dashboard} year={2025} onYearChange={onYearChange} />)
  expect(chartData('calendar-data')).toEqual([{ day: '2025-12-31', value: 1 }])
})

it('splits printed tag charts into readable groups with unique pattern IDs', () => {
  const metrics = Array.from({ length: 29 }, (_, index) => ({ id: `tag-${index}`, name: `Tag ${index}`, color: '#5486f5',
    total: 2, done: 1, inProgress: 1, todo: 0, canceled: 0, rondels: index + 1 }))
  render(<><TagBars metrics={metrics} kind="completion" /><TagBars metrics={metrics} kind="completion" printMode /></>)
  const charts = screen.getAllByTestId('bar-data')
  expect(charts).toHaveLength(4)
  expect(charts.map((chart) => JSON.parse(chart.textContent ?? '[]').length)).toEqual([29, 12, 12, 5])
  const patterns = charts.map((chart) => JSON.parse(chart.getAttribute('data-fill') ?? '[]')[0].id)
  expect(new Set(patterns).size).toBe(4)
})
