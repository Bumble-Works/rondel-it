import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { localDataSource as data } from './services/adapters/localDataSource'

describe('quick task metadata', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 28, 8))
  })

  it('saves rapid tag picks on different rows without opening task details', async () => {
    const work = await data.createTag({ name: 'work' })
    const home = await data.createTag({ name: 'home' })
    const first = await data.createTask({ title: 'First task', dayDate: '2026-10-28' })
    const second = await data.createTask({ title: 'Second task', dayDate: '2026-10-28' })
    render(<App />)
    const row = (title: string) => screen.getByRole('button', { name: `Open ${title}` }).closest('.task-row') as HTMLElement
    await screen.findByRole('button', { name: 'Open First task' })
    await userEvent.click(within(row('First task')).getByRole('button', { name: 'Tags' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'work' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'home' }))
    await waitFor(async () => expect((await data.getTask(first.id)).tagIds).toEqual([work.id, home.id]))
    expect(screen.getByRole('menuitemcheckbox', { name: 'work' })).toBeChecked()
    expect(screen.getByRole('menuitemcheckbox', { name: 'home' })).toBeChecked()
    await userEvent.click(within(row('Second task')).getByRole('button', { name: 'Tags' }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'work' }))
    await waitFor(async () => expect((await data.getTask(second.id)).tagIds).toEqual([work.id]))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(row('First task')).getByRole('button', { name: 'Remove home' }))
    await waitFor(async () => expect((await data.getTask(first.id)).tagIds).toEqual([work.id]))
    expect(screen.queryByRole('complementary', { name: 'Task details' })).not.toBeInTheDocument()
  })

  it('keeps occurrence tags individual and shows the series hint just once', async () => {
    const work = await data.createTag({ name: 'work' })
    const extra = await data.createTag({ name: 'extra' })
    const rule = await data.createRecurringRule({
      title: 'Recurring task', kind: 'repeat', tagIds: [work.id],
      repeat: { unit: 'day', every: 1, startDate: '2026-10-28', endDate: null },
    })
    await data.syncRecurring('2026-10-28')
    render(<App />)
    const open = await screen.findByRole('button', { name: 'Open Recurring task' })
    const row = open.closest('.task-row') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Tags' }))
    expect(screen.getByRole('note')).toHaveTextContent('Tags apply to this task only. Edit the series in recurring.')
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'extra' }))
    await waitFor(async () => expect((await data.listAllTasks())[0].tagIds).toEqual([work.id, extra.id]))
    expect((await data.listRecurringRules()).find((item) => item.id === rule.id)?.tagIds).toEqual([work.id])
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(row).getByRole('button', { name: 'Tags' }))
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await data.setTaskStatus((await data.listAllTasks())[0].id, 'done')
    await data.syncRecurring('2026-10-29')
    const next = (await data.listAllTasks()).find((task) => task.dayDate === '2026-10-29')
    expect(next?.tagIds).toEqual([work.id])
  })

  it('keeps the recurring reminder scope choice after its time popover closes', async () => {
    const rule = await data.createRecurringRule({ title: 'Weekly call', kind: 'weekly-on', weekday: 3 })
    render(<App />)
    const open = await screen.findByRole('button', { name: 'Open Weekly call' })
    const row = open.closest('.task-row') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Add time' }))
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '10:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Set time' }))
    expect(screen.queryByLabelText('Reminder time')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Only this one' }))
    await waitFor(async () => expect((await data.listAllTasks())[0].reminderTime).toBe('10:00'))
    expect((await data.listRecurringRules()).find((item) => item.id === rule.id)?.reminderTime).toBeNull()
    await userEvent.click(within(row).getByRole('button', { name: /Change time/ }))
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '11:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Set time' }))
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await waitFor(async () => expect((await data.listRecurringRules())[0].reminderTime).toBe('11:00'))
  })

  it('saves and removes a reminder from the row without opening the task', async () => {
    const task = await data.createTask({ title: 'Call mom', dayDate: '2026-10-28' })
    render(<App />)
    const open = await screen.findByRole('button', { name: 'Open Call mom' })
    const row = open.closest('.task-row') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Add time' }))
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '10:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Set time' }))
    await waitFor(async () => expect((await data.getTask(task.id)).reminderTime).toBe('10:00'))
    await userEvent.click(within(row).getByRole('button', { name: /Change time/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect((await data.getTask(task.id)).reminderTime).toBeNull())
    expect(screen.queryByRole('complementary', { name: 'Task details' })).not.toBeInTheDocument()
  })

  it('searches and creates tags directly from a task row', async () => {
    await data.createTag({ name: 'work' })
    const task = await data.createTask({ title: 'Plan holiday', dayDate: '2026-10-28' })
    render(<App />)
    const open = await screen.findByRole('button', { name: 'Open Plan holiday' })
    const row = open.closest('.task-row') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Tags' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Find or create a tag' }), 'WOR')
    expect(screen.getByRole('menuitemcheckbox', { name: 'work' })).toBeInTheDocument()
    await userEvent.clear(screen.getByRole('textbox', { name: 'Find or create a tag' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Find or create a tag' }), 'holiday')
    expect(screen.queryByRole('menuitemcheckbox', { name: 'work' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Create #holiday' }))
    const chip = await within(row).findByRole('button', { name: 'Remove holiday' })
    expect(chip).toBeInTheDocument()
    const tag = (await data.listTags()).find((item) => item.name === 'holiday')
    expect((await data.getTask(task.id)).tagIds).toEqual([tag?.id])
    expect(screen.queryByRole('complementary', { name: 'Task details' })).not.toBeInTheDocument()
  })
})
