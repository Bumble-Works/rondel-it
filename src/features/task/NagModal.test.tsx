import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Task } from '../../domain/types'
import { NagModal } from './NagModal'

const task = (fields: Partial<Task>): Task => ({
  id: fields.title ?? 't',
  title: 't',
  status: 'todo',
  dayDate: '2026-10-12',
  rondeled: false,
  bucket: null,
  position: 0,
  rondelCount: 0,
  flagged: false,
  reminderTime: null,
  tagIds: [],
  note: '',
  createdAt: '',
  completedAt: null,
  recurringRuleId: null,
  originDate: '2026-10-12',
  originTaskId: null,
  previousTaskId: null,
  carriedToId: null,
  ...fields,
})

describe('NagModal', () => {
  it('shows past-day leftovers and rondeled items as separate sections', () => {
    const onSetDone = vi.fn()
    render(
      <NagModal
        open
        waiting={[task({ title: 'Parked for this week', rondeled: true })]}
        leftUndone={[task({ title: 'Forgot Monday' }), task({ title: 'Was doing', status: 'doing' })]}
        weekStartDay={1}
        onClose={() => {}}
        onRondel={() => {}}
        onSetDone={onSetDone}
        onCancel={() => {}}
        onPickDate={() => {}}
      />,
    )
    const left = screen.getByRole('region', { name: 'Left undone on past days' })
    expect(left).toHaveTextContent('2 tasks were never finished')
    expect(left).toHaveTextContent('Forgot Monday')
    expect(screen.getByRole('region', { name: 'Rondeled items waiting' })).toHaveTextContent('Parked for this week')

    fireEvent.click(within(left).getAllByRole('button', { name: 'Mark done' })[0])
    expect(onSetDone).toHaveBeenCalledWith(expect.objectContaining({ title: 'Forgot Monday' }))
  })

  it('leaves out an empty section', () => {
    render(
      <NagModal open waiting={[]} leftUndone={[task({ title: 'Only one' })]} weekStartDay={1}
        onClose={() => {}} onRondel={() => {}} onSetDone={() => {}} onCancel={() => {}} onPickDate={() => {}} />,
    )
    expect(screen.queryByRole('region', { name: 'Rondeled items waiting' })).not.toBeInTheDocument()
  })
})
