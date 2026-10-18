import { canRondel, isCarriedForward, isLeftUndone, isWaitingForDecision, keepsHistoryOnRondel, showsInRondelContainer } from './rondel'
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

  it('nags about a rondeled item from the day its period starts', () => {
    const nextMonth = task({ rondeled: true, dayDate: '2026-11-01' })
    expect(isWaitingForDecision(nextMonth, '2026-10-31')).toBe(false)
    expect(isWaitingForDecision(nextMonth, '2026-11-01')).toBe(true)
    expect(isWaitingForDecision(nextMonth, '2026-11-20')).toBe(true)
    expect(isWaitingForDecision({ ...nextMonth, status: 'done' }, '2026-11-20')).toBe(false)
    expect(isWaitingForDecision(task({ dayDate: '2026-11-01' }), '2026-11-20')).toBe(false)
  })

  it("shows an item rondeled to a week that began last month in this month's container", () => {
    const october = { start: '2026-10-01', end: '2026-10-31' }
    const weekOfSep28 = task({ rondeled: true, dayDate: '2026-09-28' })
    expect(showsInRondelContainer(weekOfSep28, october, '2026-10-01')).toBe(true)
    // Browsing a future month doesn't drag earlier items along.
    const november = { start: '2026-11-01', end: '2026-11-30' }
    expect(showsInRondelContainer(weekOfSep28, november, '2026-10-01')).toBe(false)
    expect(showsInRondelContainer(task({ rondeled: true, dayDate: '2026-11-01' }), november, '2026-10-01')).toBe(true)
  })

  it('counts todo/doing tasks on past days as left undone', () => {
    const today = '2026-10-19'
    expect(isLeftUndone(task({ dayDate: '2026-10-18' }), today)).toBe(true)
    expect(isLeftUndone(task({ dayDate: '2026-10-12', status: 'doing' }), today)).toBe(true)
    // Not left undone:
    expect(isLeftUndone(task({ dayDate: today }), today)).toBe(false)
    expect(isLeftUndone(task({ dayDate: '2026-10-18', status: 'done' }), today)).toBe(false)
    expect(isLeftUndone(task({ dayDate: '2026-10-18', status: 'doing', carriedToId: 'next' }), today)).toBe(false)
    expect(isLeftUndone(task({ dayDate: '2026-10-12', rondeled: true }), today)).toBe(false)
    expect(isLeftUndone(task({ dayDate: null, bucket: 'bucket-list' }), today)).toBe(false)
  })
})
