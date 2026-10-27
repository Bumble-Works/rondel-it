import { fireEvent, render, screen, within } from '@testing-library/react'
import { reportFixture, reportFixtureTags as tags, reportFixtureTask as task } from '../../test/reportFixtures'
import { ReportTaskTable } from './ReportTaskTable'

describe('ReportTaskTable', () => {
  it('shows first-seen and completion dates, one row per chain, and completed or unfinished progress days', () => {
    const { rows } = reportFixture([
      task({ id: 'old', title: 'Old copy', status: 'doing', dayDate: '2026-10-17', carriedToId: 'live' }),
      task({ id: 'live', title: 'Current work', status: 'doing', originTaskId: 'old', previousTaskId: 'old',
        startedAt: '2026-10-16T12:00:00Z', rondelCount: 1, doingRondelCount: 1, tagIds: ['work'], note: 'Current context' }),
      task({ id: 'done', title: 'Finished', status: 'done', originDate: '2026-10-17', createdAt: '2026-10-17T12:00:00Z',
        startedAt: '2026-10-18T12:00:00Z', completedAt: '2026-10-21T12:00:00Z' }),
      task({ id: 'out', title: 'Pushed forward', dayDate: '2026-11-02', rondeled: true, rondelCount: 1,
        rondelHistory: [{ id: 'move', occurredAt: '2026-10-22T12:00:00Z', fromDate: '2026-10-22', toDate: '2026-11-02',
          fromRondeled: false, toRondeled: true, fromBucket: null, toBucket: null, status: 'todo' }] }),
    ])
    render(<ReportTaskTable rows={rows} tags={tags} selection="october" />)
    const table = screen.getByRole('table', { name: 'Tasks' })
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent?.replace(/[↑↓↕]/g, '')))
      .toEqual(['Task', 'Status', 'First seen', 'Completed', 'Rondels', 'Days in progress'])
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(screen.queryByText('Old copy')).not.toBeInTheDocument()
    const current = screen.getByRole('row', { name: /Current work/ })
    expect(current).toHaveTextContent('11 days')
    expect(within(current).getByText('Work')).toBeVisible()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show notes' }))
    expect(within(current).getByText('Current context')).toBeVisible()
    const finished = within(screen.getByRole('row', { name: /Finished/ })).getAllByRole('cell')
    expect(finished[1]).toHaveTextContent('Oct 17, 2026')
    expect(finished[2]).toHaveTextContent('Oct 21, 2026')
    expect(finished[3]).toHaveTextContent('0')
    expect(finished[4]).toHaveTextContent('3 days')
    const outgoing = screen.getByRole('row', { name: /Pushed forward/ })
    expect(within(outgoing).getAllByRole('cell')[3]).toHaveTextContent('1')
    expect(table.querySelector('details')).toBeNull()
    expect(screen.queryByText(/Scheduled for/)).not.toBeInTheDocument()
  })

  it('sorts from column headers and combines status pills including canceled', () => {
    const { rows } = reportFixture([
      task({ id: 'a', title: 'Alpha' }), task({ id: 'z', title: 'Zulu', rondelCount: 2 }),
      task({ id: 'c', title: 'Canceled task', status: 'canceled', canceledAt: '2026-10-27T12:00:00Z' }),
      task({ id: 'd', title: 'Finished', status: 'done', completedAt: '2026-10-20T12:00:00Z' }),
    ])
    render(<ReportTaskTable rows={rows} tags={tags} selection="october" />)
    const titles = () => screen.getAllByRole('rowheader').map((heading) => heading.querySelector('.report-task-title')?.textContent)
    expect(titles()).toEqual(['Zulu', 'Alpha', 'Canceled task', 'Finished'])
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Task' }))
    expect(titles()).toEqual(['Alpha', 'Canceled task', 'Finished', 'Zulu'])
    expect(screen.getByRole('columnheader', { name: 'Task' })).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Task' }))
    expect(titles()).toEqual(['Zulu', 'Finished', 'Canceled task', 'Alpha'])
    fireEvent.click(screen.getByRole('button', { name: 'Canceled' }))
    expect(titles()).toEqual(['Canceled task'])
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(titles()).toEqual(['Finished', 'Canceled task'])
    fireEvent.click(screen.getByRole('button', { name: 'All statuses' }))
    expect(titles()).toEqual(['Zulu', 'Finished', 'Canceled task', 'Alpha'])
    expect(screen.getByRole('button', { name: 'All statuses' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows full notes inline and hides them together without individual expanders', () => {
    const { rows } = reportFixture([
      task({ id: 'one', title: 'One', note: 'First full note' }),
      task({ id: 'two', title: 'Two', note: 'Second full note' }),
    ])
    render(<ReportTaskTable rows={rows} tags={tags} selection="october" />)
    expect(screen.queryByText('First full note')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show notes' }))
    expect(screen.getByText('First full note')).toBeVisible()
    expect(screen.getByText('Second full note')).toBeVisible()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show notes' }))
    expect(screen.queryByText('First full note')).not.toBeInTheDocument()
    expect(screen.queryByText('Second full note')).not.toBeInTheDocument()
    expect(screen.getByRole('table').querySelector('details')).toBeNull()
  })

  it('shows legacy progress without extra row labels and leaves untouched tasks without invented days', () => {
    const { rows } = reportFixture([
      task({ id: 'legacy-done', title: 'Older completion', status: 'done', dayDate: '2026-10-26', completedAt: '2026-10-27T12:00:00Z' }),
      task({ id: 'legacy-doing', title: 'Older work', status: 'doing', dayDate: '2026-10-26' }),
      task({ id: 'todo', title: 'Not started' }),
    ])
    render(<ReportTaskTable rows={rows} tags={tags} selection="october" />)
    for (const title of ['Older completion', 'Older work']) {
      const row = within(screen.getByRole('row', { name: new RegExp(title) }))
      expect(row.getAllByRole('cell')[4]).toHaveTextContent('1 day')
      expect(row.queryByText('Estimated from scheduled day')).not.toBeInTheDocument()
    }
    const untouched = within(screen.getByRole('row', { name: /Not started/ })).getAllByRole('cell')
    expect(untouched[2]).toHaveTextContent('—')
    expect(untouched[4]).toHaveTextContent('—')
  })

  it('renders at most fifty rows and resets the page on a sort or filter change', () => {
    const { rows } = reportFixture(Array.from({ length: 55 }, (_, index) => task({ id: String(index), title: `Task ${index}` })))
    render(<ReportTaskTable rows={rows} tags={tags} selection="october" />)
    expect(screen.getAllByRole('rowheader')).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getAllByRole('rowheader')).toHaveLength(5)
    expect(screen.getByText('51–55 of 55 tasks')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Task' }))
    expect(screen.getAllByRole('rowheader')).toHaveLength(50)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('No tasks match these dates, tags and status.')).toBeVisible()
  })
})
