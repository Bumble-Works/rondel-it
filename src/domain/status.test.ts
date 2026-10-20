import { NEXT_STATUS_LABEL, nextStatus } from './status'

describe('status', () => {
  it('moves to-do → doing → done → to-do, each named for where it goes', () => {
    expect(nextStatus('todo')).toBe('doing')
    expect(nextStatus('doing')).toBe('done')
    expect(nextStatus('done')).toBe('todo')
    expect(nextStatus('canceled')).toBe('todo')
    expect(NEXT_STATUS_LABEL.todo).toBe('Mark as doing')
  })
})
