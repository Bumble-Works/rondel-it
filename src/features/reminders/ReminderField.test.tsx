import { fireEvent, render, screen } from '@testing-library/react'
import type { Task } from '../../domain/types'
import { ReminderField } from './ReminderField'

vi.mock('../../shared/notify', () => ({ ensureNotificationPermission: vi.fn(async () => true) }))

const task = (fields: Partial<Task> = {}) =>
  ({ id: 't', dayDate: '2026-10-19', rondeled: false, carriedToId: null, recurringRuleId: null, reminderTime: null, ...fields }) as Task

describe('ReminderField', () => {
  it('saves a reminder time when leaving the field', () => {
    const onChange = vi.fn()
    render(<ReminderField task={task()} onChange={onChange} />)
    const input = screen.getByLabelText('Reminder')
    fireEvent.change(input, { target: { value: '09:30' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('09:30', 'one')
  })

  it('asks "only this one or all" on a recurring task', () => {
    const onChange = vi.fn()
    render(<ReminderField task={task({ recurringRuleId: 'r', reminderTime: '09:00' })} onChange={onChange} />)
    const input = screen.getByLabelText('Reminder')
    fireEvent.change(input, { target: { value: '09:15' } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).toHaveBeenCalledWith('09:15', 'all')
  })

  it('removes a reminder, and needs a day to set one', () => {
    const onChange = vi.fn()
    const { unmount } = render(<ReminderField task={task({ reminderTime: '09:00' })} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith(null, 'one')
    unmount()

    render(<ReminderField task={task({ dayDate: null, bucket: 'bucket-list' })} onChange={onChange} />)
    expect(screen.getByText('Give it a day to set a reminder.')).toBeInTheDocument()
  })
})
