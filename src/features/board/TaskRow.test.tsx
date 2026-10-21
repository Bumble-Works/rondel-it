import { fireEvent, render, screen } from '@testing-library/react'
import type { Task } from '../../domain/types'
import { TaskRow } from './TaskRow'

const task: Task = {
  id: 't1',
  title: 'Open task',
  status: 'todo',
  dayDate: '2026-09-21',
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
  originDate: '2026-09-21',
  originTaskId: null,
  previousTaskId: null,
  carriedToId: null,
}

function renderRow(
  selected: boolean,
  { extra = {}, repeatLabel, copies = { onCopy: vi.fn(), onPickCopyDate: vi.fn() } }: {
    extra?: Partial<Task>
    repeatLabel?: string
    copies?: { onCopy: () => void; onPickCopyDate: () => void }
  } = {},
) {
  const noop = () => {}
  render(
    <TaskRow
      task={{ ...task, ...extra }}
      tagsById={new Map()}
      repeatLabel={repeatLabel}
      selected={selected}
      onOpen={noop}
      onAdvance={noop}
      onSetDone={noop}
      onRondel={noop}
      onPickDate={noop}
      onOpenNote={noop}
      onToggleFlag={noop}
      onDelete={noop}
      onCopy={copies.onCopy}
      onPickCopyDate={copies.onPickCopyDate}
      onOpenReminder={noop}
      isDragged={false}
      onDragStartTask={noop}
      onDragEndTask={noop}
      onDropOnRow={noop}
    />,
  )
}

describe('TaskRow', () => {
  it('locks row actions while the task is open in the detail panel', () => {
    renderRow(true)
    for (const name of ['More actions', 'Add note', 'Rondel this task', 'Mark as doing']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })

  it('shows note and rondel in the row, with copy, flag and delete one menu away', () => {
    renderRow(false)
    for (const name of ['More actions', 'Add note', 'Rondel this task', 'Mark as doing']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual([
      'Copy to tomorrow',
      'Copy to a date…',
      'Flag as important',
      'Add reminder',
      'Delete task',
    ])
  })

  it('copies to tomorrow, or asks for a date', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 9))
    const copies = { onCopy: vi.fn(), onPickCopyDate: vi.fn() }
    renderRow(false, { copies })
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy to tomorrow' }))
    expect(copies.onCopy).toHaveBeenCalledWith('2026-10-20')
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy to a date…' }))
    expect(copies.onPickCopyDate).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('opens from a real button that sits next to (not around) links in the title', () => {
    const onOpen = vi.fn()
    render(
      <TaskRow
        task={{ ...task, title: 'Read https://example.com/doc' }}
        tagsById={new Map()}
        selected={false}
        onOpen={onOpen}
        onAdvance={() => {}}
        onSetDone={() => {}}
        onRondel={() => {}}
        onPickDate={() => {}}
        onOpenNote={() => {}}
        onDelete={() => {}}
        onToggleFlag={() => {}}
        onCopy={() => {}}
        onPickCopyDate={() => {}}
        onOpenReminder={() => {}}
        isDragged={false}
        onDragStartTask={() => {}}
        onDragEndTask={() => {}}
        onDropOnRow={() => {}}
      />,
    )
    const open = screen.getByRole('button', { name: 'Open Read https://example.com/doc' })
    const link = screen.getByRole('link', { name: 'example.com/doc' })
    expect(open.contains(link)).toBe(false)
    expect(link.closest('button, [role="button"]')).toBeNull()
    open.click()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('marks a recurring task with an icon that names its pattern', () => {
    renderRow(false, { extra: { recurringRuleId: 'r1' }, repeatLabel: 'Every day' })
    expect(screen.getByRole('img', { name: 'Recurring task' })).toHaveAttribute('title', 'Recurring: Every day')
  })

  it('shows no recurring icon on a one-off task', () => {
    renderRow(false)
    expect(screen.queryByRole('img', { name: 'Recurring task' })).not.toBeInTheDocument()
  })
})

