import { canRondel, isCarriedForward, keepsHistoryOnRondel } from './rondel'
import type { Task } from './types'

function task(fields: Partial<Task> = {}): Task {
  return {
    id: 't',
    title: 'T',
    status: 'todo',
    dayDate: '2026-09-21',
    rondeled: false,
    bucket: null,
    position: 0,
    rondelCount: 0,
    tagIds: [],
    note: '',
    createdAt: '',
    completedAt: null,
    recurringRuleId: null,
    originDate: '2026-09-21',
    originTaskId: null,
    previousTaskId: null,
    carriedToId: null,
    ...fields,
  }
}

describe('rondel rules', () => {
  it('only allows rondeling unfinished tasks that are not history copies', () => {
    expect(canRondel(task())).toBe(true)
    expect(canRondel(task({ status: 'doing' }))).toBe(true)
    expect(canRondel(task({ status: 'done' }))).toBe(false)
    expect(canRondel(task({ status: 'doing', carriedToId: 'next' }))).toBe(false)
    expect(isCarriedForward(task({ carriedToId: 'next' }))).toBe(true)
  })

  it('keeps history only for doing tasks on a real day', () => {
    expect(keepsHistoryOnRondel(task({ status: 'doing' }))).toBe(true)
    expect(keepsHistoryOnRondel(task())).toBe(false)
    expect(keepsHistoryOnRondel(task({ status: 'doing', rondeled: true }))).toBe(false)
    expect(keepsHistoryOnRondel(task({ status: 'doing', dayDate: null, bucket: 'bucket-list' }))).toBe(false)
  })
})
