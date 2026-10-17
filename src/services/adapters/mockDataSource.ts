import { addDays, toIso, todayIso } from '../../domain/dates'
import { occurrencesBetween, type Occurrence } from '../../domain/recurrence'
import { canRondel, isCarriedForward, isSchedulingDecision, keepsHistoryOnRondel } from '../../domain/rondel'
import type { RecurringRule, Tag, Task, TaskStatus, UserSetting } from '../../domain/types'
import { readRaw, readSettingsRaw, writeCollection, writeSettings } from '../storage/localStore'
import type { CreateTaskInput, DataSource, RecurringRuleInput } from './DataSource'

const defaultSettings: UserSetting = {
  weekStartDay: 1, // Monday
  dayStartTime: '09:00',
  endOfDayTime: '17:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}

function uid() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

/* ---------- storage (see services/storage/localStore) ---------- */

/** Fill fields added after v6 data was first saved, so existing tasks keep working. */
function normalizeTask(task: Partial<Task> & Pick<Task, 'id'>): Task {
  const normalized = {
    ...task,
    originDate: task.originDate ?? task.dayDate ?? null,
    flagged: task.flagged ?? false,
    originTaskId: task.originTaskId ?? null,
    previousTaskId: task.previousTaskId ?? null,
    carriedToId: task.carriedToId ?? null,
  } as Task
  // Older data could finish a rondeled item without leaving the container. Move
  // it to the day it was completed, as finishing one does now.
  if (normalized.rondeled && normalized.status === 'done') {
    const completedOn = normalized.completedAt ? toIso(new Date(normalized.completedAt)) : normalized.dayDate
    return { ...normalized, rondeled: false, dayDate: completedOn }
  }
  return normalized
}

function readTasks(): Task[] {
  return readRaw<Task>('tasks').map(normalizeTask)
}

function writeTasks(tasks: Task[]) {
  writeCollection('tasks', tasks, normalizeTask)
}

function readTags(): Tag[] {
  return readRaw<Tag>('tags')
}

function writeTags(tags: Tag[]) {
  writeCollection('tags', tags)
}

// Defaults aren't saved until the user changes something, so a fresh device
// never "edits" settings and overrides another device's real ones on sync.
function readSettings(): UserSetting {
  return { ...defaultSettings, ...(readSettingsRaw() ?? {}) }
}

function readRules(): RecurringRule[] {
  return readRaw<RecurringRule>('rules')
}

function writeRules(rules: RecurringRule[]) {
  writeCollection('rules', rules)
}

/* ---------- helpers ---------- */

function ordered(tasks: Task[]): Task[] {
  // Manual order (position) is respected so drag-and-drop reordering sticks.
  // Carried-forward history sits below active work; done always sinks to the bottom.
  const rank = (t: Task): number => (t.status === 'done' ? 2 : isCarriedForward(t) ? 1 : 0)
  return [...tasks].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    return a.position - b.position
  })
}

function nextStatus(status: TaskStatus): TaskStatus {
  if (status === 'todo') return 'doing'
  if (status === 'doing') return 'done'
  return 'todo'
}

function byTag(tasks: Task[], tagId?: string): Task[] {
  return tagId ? tasks.filter((t) => t.tagIds.includes(tagId)) : tasks
}

function newTask(fields: Pick<Task, 'title' | 'dayDate' | 'position'> & Partial<Task>): Task {
  return {
    id: uid(),
    status: 'todo',
    rondeled: false,
    bucket: null,
    rondelCount: 0,
    flagged: false,
    tagIds: [],
    note: '',
    createdAt: nowIso(),
    completedAt: null,
    recurringRuleId: null,
    originDate: fields.dayDate,
    originTaskId: null,
    previousTaskId: null,
    carriedToId: null,
    ...fields,
  }
}

/**
 * Starting or finishing a rondeled (waiting) task turns it into a regular task on today.
 * Its history (rondelCount, originDate, createdAt) is kept.
 */
function withStatus(task: Task, status: TaskStatus): Task {
  const leavesRondelContainer = task.rondeled && (status === 'doing' || status === 'done')
  return {
    ...task,
    status,
    completedAt: status === 'done' ? nowIso() : null,
    ...(leavesRondelContainer ? { dayDate: todayIso(), rondeled: false } : {}),
  }
}

type Placement = Pick<Task, 'dayDate' | 'rondeled' | 'bucket'>

/** Tasks shown together: the same bucket, or the same day (or day's container). */
function inSameGroup(task: Task, place: Placement): boolean {
  return place.bucket !== null
    ? task.bucket === place.bucket
    : task.dayDate === place.dayDate && task.rondeled === place.rondeled
}

function changeStatus(tasks: Task[], index: number, status: TaskStatus): Task {
  const before = tasks[index]
  let next = withStatus(before, status)
  // Reopened work goes back to the top of its group, not under everything else.
  if (status === 'todo' && before.status !== 'todo') {
    const positions = tasks.filter((t) => t.id !== next.id && inSameGroup(t, next)).map((t) => t.position)
    next = { ...next, position: Math.min(0, ...positions) - 1 }
  }
  tasks[index] = next
  return next
}

function findIndexOrThrow(tasks: Task[], id: string): number {
  const index = tasks.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Task not found')
  return index
}

/**
 * The id is derived from the rule and the day, so every device creating the
 * same occurrence produces the same record and sync merges them into one.
 */
export function occurrenceId(ruleId: string, date: string): string {
  return `rec:${ruleId}:${date}`
}

function taskFromRule(rule: RecurringRule, occ: Occurrence, position: number): Task {
  return newTask({
    id: occurrenceId(rule.id, occ.date),
    title: rule.title,
    dayDate: occ.dayDate,
    rondeled: occ.rondeled,
    bucket: occ.bucket,
    position,
    tagIds: [...rule.tagIds],
    note: rule.note,
    recurringRuleId: rule.id,
  })
}

/* ---------- adapter ---------- */

export const mockDataSource: DataSource = {
  async listTasksInRange(startDate, endDate, tagId) {
    const tasks = readTasks().filter(
      (t) => t.dayDate !== null && t.dayDate >= startDate && t.dayDate <= endDate,
    )
    return ordered(byTag(tasks, tagId))
  },

  async listBucketTasks(bucket, tagId) {
    const tasks = readTasks().filter((t) => t.bucket === bucket)
    return ordered(byTag(tasks, tagId))
  },

  async listRondelItems() {
    const tasks = readTasks().filter((t) => t.rondeled)
    return ordered(tasks)
  },

  async createTask(input: CreateTaskInput) {
    const tasks = readTasks()
    const task = newTask({
      title: input.title.trim(),
      dayDate: input.dayDate ?? null,
      rondeled: input.rondeled ?? false,
      bucket: input.bucket ?? null,
      position: tasks.length,
      tagIds: input.tagIds || [],
    })
    tasks.push(task)
    writeTasks(tasks)
    return task
  },

  async deleteTask(id) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    const [removed] = tasks.splice(index, 1)
    // Stitch the carry-forward chain around the removed task. Deleting the live
    // copy makes the history it came from a normal task again.
    const stitched = tasks.map((t) => {
      if (t.carriedToId === id) return { ...t, carriedToId: removed.carriedToId }
      if (t.previousTaskId === id) return { ...t, previousTaskId: removed.previousTaskId }
      return t
    })
    writeTasks(stitched)
  },

  async updateTask(id, input) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    tasks[index] = {
      ...tasks[index],
      title: input.title?.trim() || tasks[index].title,
      tagIds: input.tagIds ?? tasks[index].tagIds,
      note: input.note ?? tasks[index].note,
      flagged: input.flagged ?? tasks[index].flagged,
    }
    writeTasks(tasks)
    return tasks[index]
  },

  async advanceTask(id) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    const task = changeStatus(tasks, index, nextStatus(tasks[index].status))
    writeTasks(tasks)
    return task
  },

  async setTaskStatus(id, status) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    const task = changeStatus(tasks, index, status)
    writeTasks(tasks)
    return task
  },

  async moveTask(id, target, options) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    const source = tasks[index]

    const dayDate = target.dayDate ?? null
    const rondeled = target.rondeled ?? false
    const bucket = target.bucket ?? null
    const rondel = (options?.rondel ?? false) && !isSchedulingDecision(source, { dayDate, rondeled, bucket })
    const beforeId = options?.beforeId ?? null

    if (rondel && !canRondel(source)) {
      throw new Error('Done tasks and carried-forward history can not be rondeled')
    }

    let moved: Task
    if (rondel && keepsHistoryOnRondel(source)) {
      // Leave the source on its day as history; carry a doing copy forward.
      moved = newTask({
        title: source.title,
        status: 'doing',
        dayDate,
        rondeled,
        bucket,
        position: tasks.length,
        rondelCount: source.rondelCount + 1,
        flagged: source.flagged,
        tagIds: [...source.tagIds],
        note: source.note,
        recurringRuleId: source.recurringRuleId,
        originDate: source.originDate,
        originTaskId: source.originTaskId ?? source.id,
        previousTaskId: source.id,
      })
      tasks[index] = { ...source, carriedToId: moved.id }
      tasks.push(moved)
    } else {
      moved = {
        ...source,
        dayDate,
        rondeled,
        bucket,
        originDate: source.originDate ?? dayDate,
        // Rondeling counts the carry-forward; a canceled task comes back as todo.
        ...(rondel
          ? {
              rondelCount: source.rondelCount + 1,
              ...(source.status === 'canceled' ? { status: 'todo' as const, completedAt: null } : {}),
            }
          : {}),
      }
      tasks[index] = moved
    }
    const movedId = moved.id

    const inGroup = (t: Task) => inSameGroup(t, { dayDate, rondeled, bucket })

    // Build the group in the same order the UI displays it (ordered()), so the
    // beforeId — which comes from the rendered list — maps to the right slot.
    const group = ordered(tasks.filter((t) => t.id !== movedId && inGroup(t)))

    let insertAt = group.length
    if (beforeId) {
      const at = group.findIndex((t) => t.id === beforeId)
      if (at >= 0) insertAt = at
    }
    group.splice(insertAt, 0, moved)

    group.forEach((t, position) => {
      const gi = tasks.findIndex((x) => x.id === t.id)
      tasks[gi] = { ...tasks[gi], position }
    })

    writeTasks(tasks)
    return tasks[findIndexOrThrow(tasks, movedId)]
  },

  async listTags() {
    return readTags()
  },

  async createTag(input) {
    const tags = readTags()
    const tag: Tag = { id: uid(), name: input.name.trim(), color: input.color || '#3b82f6' }
    tags.push(tag)
    writeTags(tags)
    return tag
  },

  async updateTag(id, input) {
    const tags = readTags()
    const index = tags.findIndex((t) => t.id === id)
    if (index === -1) throw new Error('Tag not found')
    tags[index] = {
      ...tags[index],
      name: input.name?.trim() || tags[index].name,
      color: input.color || tags[index].color,
    }
    writeTags(tags)
    return tags[index]
  },

  async deleteTag(id) {
    writeTags(readTags().filter((t) => t.id !== id))
    const tasks = readTasks().map((t) => ({ ...t, tagIds: t.tagIds.filter((x) => x !== id) }))
    writeTasks(tasks)
  },

  async getSettings() {
    return readSettings()
  },

  async updateSettings(input) {
    const next = { ...readSettings(), ...input }
    writeSettings(next)
    return next
  },

  async listRecurringRules() {
    return readRules()
  },

  async createRecurringRule(input: RecurringRuleInput) {
    const rules = readRules()
    const rule: RecurringRule = {
      id: uid(),
      title: input.title.trim(),
      tagIds: input.tagIds || [],
      note: input.note || '',
      kind: input.kind,
      weekday: input.weekday ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      createdAt: nowIso(),
      lastRunDate: null,
    }
    rules.push(rule)
    writeRules(rules)
    return rule
  },

  async updateRecurringRule(id, input) {
    const rules = readRules()
    const index = rules.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Recurring rule not found')
    rules[index] = {
      ...rules[index],
      title: input.title?.trim() || rules[index].title,
      tagIds: input.tagIds ?? rules[index].tagIds,
      note: input.note ?? rules[index].note,
      kind: input.kind ?? rules[index].kind,
      weekday: input.weekday !== undefined ? input.weekday : rules[index].weekday,
      dayOfMonth: input.dayOfMonth !== undefined ? input.dayOfMonth : rules[index].dayOfMonth,
    }
    writeRules(rules)
    return rules[index]
  },

  async deleteRecurringRule(id) {
    writeRules(readRules().filter((r) => r.id !== id))
  },

  async syncRecurring(horizonDate) {
    const rules = readRules()
    const weekStartDay = readSettings().weekStartDay
    const tasks = readTasks()
    let changedTasks = false
    let changedRules = false

    const isStartRule = (kind: RecurringRule['kind']) =>
      kind === 'weekly-start' || kind === 'monthly-start'

    // Keep only one outstanding (not-done) task per start-rule: clean up any
    // duplicates (from older versions, or two devices before sync), keeping the
    // earliest. Ordered by creation then id, so every device keeps the same one.
    for (const rule of rules) {
      if (!isStartRule(rule.kind)) continue
      const pending = tasks
        .filter((t) => t.recurringRuleId === rule.id && t.status !== 'done' && !isCarriedForward(t))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      if (pending.length > 1) {
        const removeIds = new Set(pending.slice(1).map((t) => t.id))
        for (let i = tasks.length - 1; i >= 0; i--) {
          if (removeIds.has(tasks[i].id)) tasks.splice(i, 1)
        }
        changedTasks = true
      }
    }

    for (const [index, rule] of rules.entries()) {
      const start = rule.lastRunDate ? addDays(rule.lastRunDate, 1) : rule.createdAt.slice(0, 10)
      const occurrences = occurrencesBetween(rule, start, horizonDate, weekStartDay)
      if (occurrences.length === 0) continue

      // Start-rules keep at most one outstanding (not-done) task. Don't spawn
      // the next until the current one is completed — no duplicates.
      if (isStartRule(rule.kind)) {
        const hasPending = tasks.some(
          (t) => t.recurringRuleId === rule.id && t.status !== 'done' && !isCarriedForward(t),
        )
        if (hasPending) continue

        const occ = occurrences[0]
        tasks.push(taskFromRule(rule, occ, tasks.length))
        changedTasks = true
        if (!rule.lastRunDate || occ.date > rule.lastRunDate) {
          rules[index] = { ...rule, lastRunDate: occ.date }
          changedRules = true
        }
        continue
      }

      let last = rule.lastRunDate
      for (const occ of occurrences) {
        tasks.push(taskFromRule(rule, occ, tasks.length))
        changedTasks = true
        if (!last || occ.date > last) last = occ.date
      }

      if (last !== rule.lastRunDate) {
        rules[index] = { ...rule, lastRunDate: last }
        changedRules = true
      }
    }

    if (changedTasks) writeTasks(tasks)
    if (changedRules) writeRules(rules)
  },
}
