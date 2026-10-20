import { fireEvent, render, screen } from '@testing-library/react'
import type { Task } from '../../domain/types'
import { ReminderList } from './ReminderList'

const call = { id: 'call', title: 'Call the bank', status: 'todo', dayDate: '2026-10-19', reminderTime: '12:30' } as Task

describe('ReminderList', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 12, 30)) // Mon Oct 19
  })

  it('offers snooze, done and reschedule for each reminder', () => {
    const onAct = vi.fn()
    render(<ReminderList tasks={[call]} weekStartDay={1} onAct={onAct} />)
    expect(screen.getByText('Call the bank')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Snooze 10 min' }))
    expect(onAct).toHaveBeenLastCalledWith(call, { kind: 'snooze' })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onAct).toHaveBeenLastCalledWith(call, { kind: 'done' })
    fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' }))
    expect(onAct).toHaveBeenLastCalledWith(call, { kind: 'reschedule', target: { toDate: '2026-10-20', rondeled: false } })
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(onAct).toHaveBeenLastCalledWith(call, { kind: 'reschedule', target: { toDate: '2026-10-26', rondeled: true } })
  })

  it('reschedules to a picked date', () => {
    const onAct = vi.fn()
    render(<ReminderList tasks={[call]} weekStartDay={1} onAct={onAct} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }))
    fireEvent.change(screen.getByLabelText('Move this task to'), { target: { value: '2026-10-23' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rondel it' }))
    expect(onAct).toHaveBeenCalledWith(call, { kind: 'reschedule', target: { toDate: '2026-10-23', rondeled: false } })
  })
})
