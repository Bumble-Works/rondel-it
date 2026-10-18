import { render, screen } from '@testing-library/react'
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

function renderRow(selected: boolean) {
  const noop = () => {}
  render(
    <TaskRow
      task={task}
      tagsById={new Map()}
      selected={selected}
      onOpen={noop}
      onAdvance={noop}
      onSetDone={noop}
      onRondel={noop}
      onPickDate={noop}
      onOpenNote={noop}
      onToggleFlag={noop}
      onDelete={noop}
      dragging={false}
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
    for (const name of ['Flag as important', 'Add note', 'Delete task', 'Rondel this task', 'Mark as doing']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })

  it('keeps row actions available when the task is not open', () => {
    renderRow(false)
    for (const name of ['Flag as important', 'Add note', 'Delete task', 'Rondel this task', 'Mark as doing']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
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
        dragging={false}
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
})
