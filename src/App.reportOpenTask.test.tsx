import { renderWithQuery as render } from './test/queryTestUtils'
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { localDataSource as data } from './services/adapters/localDataSource'

describe('opening a task from Reports', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 28, 8))
  })

  const openReportTasks = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Reports' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Tasks' }))
  }
  const detailsTitle = () => within(screen.getByRole('complementary', { name: 'Task details' })).getByRole('textbox', { name: /title/i })

  it('shows the Bucket List with the task open, by click and by Enter', async () => {
    const started = await data.createTask({ title: 'Learn to sail', dayDate: '2026-10-27' })
    await data.setTaskStatus(started.id, 'doing')
    const parked = await data.moveTask(started.id, { bucket: 'bucket-list' }, { rondel: true })
    expect(parked.id).not.toBe(started.id)
    render(<App />)
    await openReportTasks()
    fireEvent.click(await screen.findByRole('button', { name: 'Learn to sail' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Bucket List' })).toBeInTheDocument()
    expect(detailsTitle()).toHaveValue('Learn to sail')

    await openReportTasks()
    ;(await screen.findByRole('button', { name: 'Learn to sail' })).focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Bucket List' })).toBeInTheDocument()
    expect(detailsTitle()).toHaveValue('Learn to sail')
  })

  it('still opens a dated task on its day', async () => {
    await data.createTask({ title: 'Dentist', dayDate: '2026-10-26' })
    render(<App />)
    await openReportTasks()
    fireEvent.click(await screen.findByRole('button', { name: 'Dentist' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Monday' })).toBeInTheDocument()
    expect(detailsTitle()).toHaveValue('Dentist')
  })
})
