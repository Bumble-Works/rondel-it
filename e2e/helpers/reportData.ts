import type { Page } from '@playwright/test'
import type { Tag, Task, TaskRondel } from '../../src/domain/types.ts'

export const REPORT_NOW = '2026-10-27T12:00:00Z'

const tags: Tag[] = [
  { id: 'work', name: 'work', color: '#5486f5' },
  { id: 'fitness', name: 'fitness', color: '#16b98a' },
  { id: 'bills', name: 'bills', color: '#e9a44e' },
]

function task(fields: Pick<Task, 'id'> & Partial<Task>): Task {
  return {
    title: fields.id, status: 'todo', dayDate: '2026-10-27', rondeled: false,
    bucket: null, position: 0, rondelCount: 0, doingRondelCount: 0,
    startedAt: null, canceledAt: null, bucketListOrigin: false, rondelHistory: [],
    flagged: false, reminderTime: null, tagIds: [], note: '',
    createdAt: '2026-10-14T08:00:00Z', completedAt: null, recurringRuleId: null,
    originDate: '2026-10-14', originTaskId: null, previousTaskId: null, carriedToId: null,
    ...fields,
  }
}

function move(id: string, fromDate: string, toDate: string, status: 'todo' | 'doing' = 'todo'): TaskRondel {
  return {
    id, occurredAt: `${fromDate}T12:00:00Z`, fromDate, toDate, status,
    fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: null,
  }
}

function reportTasks(): Task[] {
  return [
    task({ id: 'work-done', tagIds: ['work'], status: 'done', dayDate: '2026-10-20',
      originDate: '2026-10-17', startedAt: '2026-10-18T12:00:00Z', completedAt: '2026-10-21T12:00:00Z' }),
    task({ id: 'work-active', tagIds: ['work'], status: 'doing', startedAt: '2026-10-25T12:00:00Z' }),
    task({ id: 'fitness-done', tagIds: ['fitness'], status: 'done', dayDate: '2026-10-23', completedAt: '2026-10-23T12:00:00Z' }),
    task({ id: 'shared-done', tagIds: ['work', 'fitness'], status: 'done', dayDate: '2026-10-26', completedAt: '2026-10-26T12:00:00Z' }),
    task({ id: 'untagged' }),
    task({ id: 'canceled', tagIds: ['work'], status: 'canceled', dayDate: '2026-10-25', canceledAt: '2026-10-25T12:00:00Z' }),
    task({ id: 'history', tagIds: ['work'], status: 'doing', dayDate: '2026-10-17',
      startedAt: '2026-10-16T12:00:00Z', carriedToId: 'history-live',
      rondelHistory: [move('within', '2026-10-17', '2026-10-27', 'doing')] }),
    task({ id: 'history-live', tagIds: ['work'], status: 'doing', originTaskId: 'history', previousTaskId: 'history',
      startedAt: '2026-10-16T12:00:00Z', rondelCount: 1, doingRondelCount: 1 }),
    task({ id: 'pushed-out', tagIds: ['work'], dayDate: '2026-11-02', rondeled: true, rondelCount: 1,
      rondelHistory: [{ ...move('out', '2026-10-22', '2026-11-02'), toRondeled: true }] }),
    task({ id: 'brought-in', tagIds: ['work'], dayDate: '2026-10-24', rondelCount: 1,
      rondelHistory: [move('in', '2026-09-30', '2026-10-24')] }),
    task({ id: 'waiting', tagIds: ['work'], dayDate: '2026-10-26', rondeled: true }),
    task({ id: 'dream-open', tagIds: ['fitness'], dayDate: null, originDate: null, bucket: 'bucket-list', bucketListOrigin: true }),
    task({ id: 'dream-done', tagIds: ['fitness'], status: 'done', dayDate: '2026-10-25',
      bucketListOrigin: true, completedAt: '2026-10-25T12:00:00Z' }),
  ].map((record, position) => ({ ...record, position }))
}

export function legacyReportTask(): Partial<Task> {
  const record: Partial<Task> = task({
    id: 'legacy', status: 'done', dayDate: '2026-10-20',
    completedAt: '2026-10-21T12:00:00Z', rondelCount: 3,
  })
  for (const field of ['doingRondelCount', 'startedAt', 'bucketListOrigin', 'canceledAt', 'rondelHistory'] as const) {
    delete record[field]
  }
  return record
}

export async function seedReportData(page: Page, tasks: Partial<Task>[] = reportTasks()): Promise<void> {
  await page.addInitScript(({ tasks, tags }) => {
    // Seed only this fresh test profile. Reloads must preserve changes made through the UI.
    if (localStorage.getItem('rondel.v6.tasks') !== null) return
    localStorage.setItem('rondel.v6.tasks', JSON.stringify(tasks))
    localStorage.setItem('rondel.v6.tags', JSON.stringify(tags))
    localStorage.setItem('rondel.v6.rules', '[]')
    localStorage.setItem('rondel.v6.settings', JSON.stringify({
      weekStartDay: 1, dayStartTime: '13:00', endOfDayTime: '17:00', timezone: 'UTC',
    }))
  }, { tasks, tags })
}
