import { fireEvent, render, screen, within } from '@testing-library/react'
import { buildDashboard } from '../../domain/reports'
import { reportFixtureTask as task } from '../../test/reportFixtures'
import { ReportHighlights } from './ReportHighlights'

const tags = [{ id: 'work', name: 'Work', color: '#5486f5' }, { id: 'home', name: 'Home', color: '#16b98a' }]
const range = { start: '2026-10-14', end: '2026-10-27' }
const today = '2026-10-27'

it('orders the overview, keeps tags out, and opens left-behind todos from their own box', () => {
  const dashboard = buildDashboard([
    task({ id: 'todo', dayDate: '2026-10-26', tagIds: ['work'] }),
    task({ id: 'doing', status: 'doing', dayDate: '2026-11-02' }),
    task({ id: 'done', status: 'done', completedAt: '2026-10-27T12:00:00Z' }),
    task({ id: 'cancel', status: 'canceled', dayDate: '2026-10-26', tagIds: ['home'] }),
  ], tags, range, { includeCanceled: true }, today)
  const onLeftBehind = vi.fn()
  const { container } = render(<ReportHighlights dashboard={dashboard} onLeftBehind={onLeftBehind} />)
  expect([...container.querySelectorAll('.report-highlight > span')].map((span) => span.textContent))
    .toEqual(['To do', 'In progress', 'Done', 'Rondeled', 'Canceled', 'Left behind'])
  expect([...container.querySelectorAll('.report-highlight > strong')].map((strong) => strong.textContent))
    .toEqual(['1', '1', '1', '0', '1'])
  expect(container.querySelector('.chip')).toBeNull()
  expect(screen.queryByText('Untagged')).not.toBeInTheDocument()
  expect(screen.queryByText('Older moves aren’t dated')).not.toBeInTheDocument()
  expect(screen.getByText('🧭 Needs some attention')).toBeVisible()
  expect(screen.getByTitle('Unfinished to-dos still dated in the past.')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Show 1 task left behind' }))
  expect(onLeftBehind).toHaveBeenCalledOnce()
})

it('celebrates zero left-behind items and updates Canceled when the report tags change', () => {
  const tasks = [
    task({ id: 'work', status: 'canceled', dayDate: '2026-10-26', tagIds: ['work'] }),
    task({ id: 'both', status: 'canceled', dayDate: '2026-10-26', tagIds: ['work', 'home'] }),
  ]
  const report = (tagIds: string[], tagMatch: 'any' | 'all' = 'any') =>
    buildDashboard(tasks, tags, range, { tagIds, tagMatch, includeCanceled: true }, today)
  const { rerender } = render(<ReportHighlights dashboard={report(['work'])} onLeftBehind={vi.fn()} />)
  const canceledCount = () => screen.getByText('Canceled', { selector: '.report-highlight > span' }).parentElement!
  expect(within(canceledCount()).getByText('2')).toBeVisible()
  expect(screen.getByText('🌟 All clear nicely done')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Show 0 tasks left behind' })).toBeDisabled()
  rerender(<ReportHighlights dashboard={report(['home'])} onLeftBehind={vi.fn()} />)
  expect(within(canceledCount()).getByText('1')).toBeVisible()
  rerender(<ReportHighlights dashboard={report(['work', 'home'], 'all')} onLeftBehind={vi.fn()} />)
  expect(within(canceledCount()).getByText('1')).toBeVisible()
  rerender(<ReportHighlights dashboard={report(['missing'])} onLeftBehind={vi.fn()} />)
  expect(within(canceledCount()).getByText('0')).toBeVisible()
})
