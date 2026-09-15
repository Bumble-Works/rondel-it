import { addDays } from '../../domain/dates'
import { occurrencesBetween } from '../../domain/recurrence'
import type { RecurringRule, Tag, Task, TaskStatus, UserSetting } from '../../domain/types'
import type { CreateTaskInput, DataSource, RecurringRuleInput } from './DataSource'

const TASKS_KEY = 'rondel.v6.tasks'
const TAGS_KEY = 'rondel.v6.tags'
const SETTINGS_KEY = 'rondel.v6.settings'
const RULES_KEY = 'rondel.v6.rules'

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

/* ---------- seed ---------- */

// The app starts empty — a clean slate for the user's own tasks.
function buildSeed(): { tasks: Task[]; tags: Tag[] } {
  return { tasks: [], tags: [] }
}

/* ---------- storage ---------- */

function seedIfEmpty(): { tasks: Task[]; tags: Tag[] } {
  const rawTasks = localStorage.getItem(TASKS_KEY)
  const rawTags = localStorage.getItem(TAGS_KEY)
  if (rawTasks && rawTags) {
    return { tasks: JSON.parse(rawTasks) as Task[], tags: JSON.parse(rawTags) as Tag[] }
  }
  const seed = buildSeed()
  localStorage.setItem(TASKS_KEY, JSON.stringify(seed.tasks))
  localStorage.setItem(TAGS_KEY, JSON.stringify(seed.tags))
  return seed
}

function readTasks(): Task[] {
  seedIfEmpty()
  return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]') as Task[]
}

function writeTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

function readTags(): Tag[] {
  seedIfEmpty()
  return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]') as Tag[]
}

function writeTags(tags: Tag[]) {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
}

function readSettings(): UserSetting {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings))
    return defaultSettings
  }
  return { ...defaultSettings, ...(JSON.parse(raw) as Partial<UserSetting>) }
}

function writeSettings(settings: UserSetting) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function readRules(): RecurringRule[] {
  const raw = localStorage.getItem(RULES_KEY)
  if (!raw) {
    const seeded = buildSeedRules()
    localStorage.setItem(RULES_KEY, JSON.stringify(seeded))
    return seeded
  }
  return JSON.parse(raw) as RecurringRule[]
}

function writeRules(rules: RecurringRule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

function buildSeedRules(): RecurringRule[] {
  // Start with no recurring rules — the user creates their own.
  return []
}

/* ---------- helpers ---------- */

function ordered(tasks: Task[]): Task[] {
  // Manual order (position) is respected so drag-and-drop reordering sticks.
  // Completed tasks always sink to the bottom.
  const rank = (t: Task): number => (t.status === 'done' ? 1 : 0)
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

function findIndexOrThrow(tasks: Task[], id: string): number {
  const index = tasks.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Task not found')
  return index
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
    const task: Task = {
      id: uid(),
      title: input.title.trim(),
      status: 'todo',
      dayDate: input.dayDate ?? null,
      rondeled: input.rondeled ?? false,
      bucket: input.bucket ?? null,
      position: tasks.length,
      rondelCount: 0,
      tagIds: input.tagIds || [],
      note: '',
      createdAt: nowIso(),
      completedAt: null,
      recurringRuleId: null,
    }
    tasks.push(task)
    writeTasks(tasks)
    return task
  },

  async deleteTask(id) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    tasks.splice(index, 1)
    writeTasks(tasks)
  },

  async updateTask(id, input) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    tasks[index] = {
      ...tasks[index],
      title: input.title?.trim() || tasks[index].title,
      tagIds: input.tagIds ?? tasks[index].tagIds,
      note: input.note ?? tasks[index].note,
    }
    writeTasks(tasks)
    return tasks[index]
  },

  async advanceTask(id) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    const status = nextStatus(tasks[index].status)
    tasks[index] = {
      ...tasks[index],
      status,
      completedAt: status === 'done' ? nowIso() : null,
    }
    writeTasks(tasks)
    return tasks[index]
  },

  async setTaskStatus(id, status) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)
    tasks[index] = {
      ...tasks[index],
      status,
      completedAt: status === 'done' ? nowIso() : null,
    }
    writeTasks(tasks)
    return tasks[index]
  },

  async moveTask(id, target, options) {
    const tasks = readTasks()
    const index = findIndexOrThrow(tasks, id)

    const dayDate = target.dayDate ?? null
    const rondeled = target.rondeled ?? false
    const bucket = target.bucket ?? null
    const rondel = options?.rondel ?? false
    const beforeId = options?.beforeId ?? null

    tasks[index] = {
      ...tasks[index],
      dayDate,
      rondeled,
      bucket,
      // Rondeling is a carry-forward: reset to a fresh todo and bump the count.
      ...(rondel
        ? { status: 'todo' as const, completedAt: null, rondelCount: tasks[index].rondelCount + 1 }
        : {}),
    }

    const inGroup = (t: Task) =>
      bucket !== null
        ? t.bucket === bucket
        : t.dayDate === dayDate && t.rondeled === rondeled

    const moved = tasks[index]
    // Build the group in the same order the UI displays it (ordered()), so the
    // beforeId — which comes from the rendered list — maps to the right slot.
    const group = ordered(tasks.filter((t) => t.id !== id && inGroup(t)))

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
    return tasks[findIndexOrThrow(tasks, id)]
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
    // duplicates from earlier over-generation, keeping the earliest.
    for (const rule of rules) {
      if (!isStartRule(rule.kind)) continue
      const pending = tasks
        .filter((t) => t.recurringRuleId === rule.id && t.status !== 'done')
        .sort((a, b) => a.position - b.position)
      if (pending.length > 1) {
        const removeIds = new Set(pending.slice(1).map((t) => t.id))
        for (let i = tasks.length - 1; i >= 0; i--) {
          if (removeIds.has(tasks[i].id)) tasks.splice(i, 1)
        }
        changedTasks = true
      }
    }

    for (const rule of rules) {
      const start = rule.lastRunDate ? addDays(rule.lastRunDate, 1) : rule.createdAt.slice(0, 10)
      const occurrences = occurrencesBetween(rule, start, horizonDate, weekStartDay)
      if (occurrences.length === 0) continue

      // Start-rules keep at most one outstanding (not-done) task. Don't spawn
      // the next until the current one is completed — no duplicates.
      if (isStartRule(rule.kind)) {
        const hasPending = tasks.some(
          (t) => t.recurringRuleId === rule.id && t.status !== 'done',
        )
        if (hasPending) continue

        const occ = occurrences[0]
        tasks.push({
          id: uid(),
          title: rule.title,
          status: 'todo',
          dayDate: occ.dayDate,
          rondeled: occ.rondeled,
          bucket: occ.bucket,
          position: tasks.length,
          rondelCount: 0,
          tagIds: [...rule.tagIds],
          note: rule.note,
          createdAt: nowIso(),
          completedAt: null,
          recurringRuleId: rule.id,
        })
        changedTasks = true
        if (!rule.lastRunDate || occ.date > rule.lastRunDate) {
          rule.lastRunDate = occ.date
          changedRules = true
        }
        continue
      }

      let last = rule.lastRunDate
      for (const occ of occurrences) {
        tasks.push({
          id: uid(),
          title: rule.title,
          status: 'todo',
          dayDate: occ.dayDate,
          rondeled: occ.rondeled,
          bucket: occ.bucket,
          position: tasks.length,
          rondelCount: 0,
          tagIds: [...rule.tagIds],
          note: rule.note,
          createdAt: nowIso(),
          completedAt: null,
          recurringRuleId: rule.id,
        })
        changedTasks = true
        if (!last || occ.date > last) last = occ.date
      }

      if (last !== rule.lastRunDate) {
        rule.lastRunDate = last
        changedRules = true
      }
    }

    if (changedTasks) writeTasks(tasks)
    if (changedRules) writeRules(rules)
  },
}
