import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { reportFixture, reportFixtureTask as task } from '../../test/reportFixtures'
import { openExternal } from '../../shared/openExternal'
import { ReportTable } from './ReportTable'

vi.mock('../../shared/openExternal', () => ({ openExternal: vi.fn().mockResolvedValue(undefined) }))

it('opens the current carried task by title with mouse, Enter and Space, keeping URLs separate', async () => {
  vi.mocked(openExternal).mockResolvedValue(undefined)
  const user = userEvent.setup()
  const onOpenTask = vi.fn()
  const title = 'Read https://example.com'
  const { rows } = reportFixture([
    task({ id: 'old', title: 'Old copy', carriedToId: 'live', status: 'doing' }),
    task({ id: 'live', title, originTaskId: 'old', previousTaskId: 'old', status: 'doing', dayDate: '2026-10-28' }),
  ])
  render(<ReportTable rows={rows} tags={[]} showNotes={false} sort="title" direction="ascending" onOpenTask={onOpenTask} />)
  const button = screen.getByText(title)
  expect(button.tagName).toBe('BUTTON')
  expect(button.querySelector('a')).toBeNull()
  await user.click(button)
  await user.keyboard('{Enter}')
  await user.keyboard(' ')
  expect(onOpenTask.mock.calls).toEqual([['live'], ['live'], ['live']])
  onOpenTask.mockClear()
  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('href', 'https://example.com')
  await user.click(link)
  link.focus()
  await user.keyboard('{Enter}')
  expect(openExternal).toHaveBeenCalledWith('https://example.com')
  expect(openExternal).toHaveBeenCalledTimes(2)
  expect(onOpenTask).not.toHaveBeenCalled()
})

it('keeps printable titles and notes linkified without task-opening controls', () => {
  const { rows } = reportFixture([task({ title: 'Read https://example.com', note: 'See https://example.org' })])
  render(<ReportTable rows={rows} tags={[]} showNotes sort="title" direction="ascending" />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getAllByRole('link')).toHaveLength(2)
  expect(screen.getByRole('rowheader')).toHaveTextContent('Read example.com')
})
