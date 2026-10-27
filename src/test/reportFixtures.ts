import { buildDashboard } from '../domain/reports'
import type { Task } from '../domain/types'

export const reportFixtureTags = [{ id: 'work', name: 'Work', color: '#5486f5' }]

export function reportFixtureTask(fields: Partial<Task> = {}): Task {
  return {
    id: 'task', title: 'A task', status: 'todo', dayDate: '2026-10-27',
    rondeled: false, bucket: null, position: 0, rondelCount: 0, doingRondelCount: 0,
    startedAt: null, canceledAt: null, bucketListOrigin: false, rondelHistory: [],
    flagged: false, reminderTime: null, tagIds: [], note: '',
    createdAt: '2026-10-14T08:00:00Z', completedAt: null, recurringRuleId: null,
    originDate: '2026-10-14', originTaskId: null, previousTaskId: null, carriedToId: null,
    ...fields,
  }
}

export function reportFixture(tasks: Task[]) {
  return buildDashboard(tasks, reportFixtureTags, { start: '2026-10-01', end: '2026-10-31' }, { includeCanceled: true }, '2026-10-27')
}
