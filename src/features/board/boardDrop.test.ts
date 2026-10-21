import type { Task } from '../../domain/types'
import { beforeIdForDrop, dropSpot, rowDropId, sectionDropId } from './boardDrop'
import type { BoardGroup } from './WeekBoard'

const tasks = (...ids: string[]) => ids.map((id) => ({ id }) as Task)
const groups: BoardGroup[] = [
  { key: 'mon', kind: 'day', title: 'Mon', addTarget: { dayDate: '2026-10-19' }, tasks: tasks('a', 'b', 'c') },
  { key: 'tue', kind: 'day', title: 'Tue', addTarget: { dayDate: '2026-10-20' }, tasks: tasks('d') },
  { key: 'history', kind: 'bucket', title: 'No target', tasks: tasks('e') },
]

describe('boardDrop', () => {
  it('reorders within a list, accounting for the dragged task leaving its place', () => {
    expect(beforeIdForDrop(['a', 'b', 'c'], 'a', 2, 'before')).toBe('c') // a lands between b and c
    expect(beforeIdForDrop(['a', 'b', 'c'], 'a', 2, 'after')).toBeNull() // a goes last
    expect(beforeIdForDrop(['a', 'b', 'c'], 'c', 0, 'before')).toBe('a')
  })

  it('drops onto another day’s row, before or after it', () => {
    expect(dropSpot(groups, 'a', rowDropId('d'), 'before')).toEqual({ target: { dayDate: '2026-10-20' }, beforeId: 'd' })
    expect(dropSpot(groups, 'a', rowDropId('d'), 'after')).toEqual({ target: { dayDate: '2026-10-20' }, beforeId: null })
  })

  it('drops into a section’s empty space as its last task', () => {
    expect(dropSpot(groups, 'a', sectionDropId('tue'), 'after')).toEqual({ target: { dayDate: '2026-10-20' }, beforeId: null })
  })

  it('goes nowhere when dropped on itself, or on a section that takes no tasks', () => {
    expect(dropSpot(groups, 'a', rowDropId('a'), 'before')).toBeNull()
    expect(dropSpot(groups, 'a', rowDropId('e'), 'before')).toBeNull()
    expect(dropSpot(groups, 'a', sectionDropId('history'), 'after')).toBeNull()
  })
})
