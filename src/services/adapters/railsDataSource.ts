import type { RecurringRule, Tag, Task, UserSetting } from '../../domain/types'
import type { CreateTaskInput, DataSource, RecurringRuleInput } from './DataSource'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  let body: unknown = undefined
  if (response.status !== 204) {
    try {
      body = await response.json()
    } catch (e) {
      // A failed request may return a non-JSON error page; statusText below
      // still explains it. A successful one must be JSON.
      if (response.ok) throw new Error(`Invalid JSON response from ${path}`, { cause: e })
    }
  }
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : response.statusText
    throw new Error(message || 'Request failed')
  }

  return body as T
}

/** Rails permits snake_case params; responses come back camelCased. */
function snakeKeys(input: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), value]),
  )
}

function mapTask(payload: Record<string, unknown>): Task {
  return {
    id: String(payload.id),
    title: String(payload.title),
    status: String(payload.status) as Task['status'],
    dayDate: payload.dayDate ? String(payload.dayDate) : null,
    rondeled: Boolean(payload.rondeled),
    bucket: (payload.bucket as Task['bucket']) ?? null,
    position: Number(payload.position),
    rondelCount: Number(payload.rondelCount),
    flagged: Boolean(payload.flagged),
    reminderTime: optionalString(payload.reminderTime),
    tagIds: (payload.tagIds as string[]) || [],
    note: String(payload.note || ''),
    createdAt: String(payload.createdAt || ''),
    completedAt: payload.completedAt ? String(payload.completedAt) : null,
    recurringRuleId: payload.recurringRuleId ? String(payload.recurringRuleId) : null,
    originDate: optionalString(payload.originDate) ?? optionalString(payload.dayDate),
    originTaskId: optionalString(payload.originTaskId),
    previousTaskId: optionalString(payload.previousTaskId),
    carriedToId: optionalString(payload.carriedToId),
  }
}

function optionalString(value: unknown): string | null {
  return value ? String(value) : null
}

export const railsDataSource: DataSource = {
  async listTasksInRange(startDate, endDate, tagId) {
    const response = await request<{ tasks: Record<string, unknown>[] }>(
      `/tasks?start=${startDate}&end=${endDate}`,
    )
    const tasks = response.tasks.map(mapTask)
    return tagId ? tasks.filter((t) => t.tagIds.includes(tagId)) : tasks
  },

  async listBucketTasks(bucket, tagId) {
    const response = await request<{ tasks: Record<string, unknown>[] }>(`/tasks?bucket=${bucket}`)
    const tasks = response.tasks.map(mapTask)
    return tagId ? tasks.filter((t) => t.tagIds.includes(tagId)) : tasks
  },

  async listRondelItems() {
    const response = await request<{ tasks: Record<string, unknown>[] }>('/tasks?rondel=1')
    return response.tasks.map(mapTask)
  },

  async listUpcomingReminders(fromDate) {
    const response = await request<{ tasks: Record<string, unknown>[] }>(`/tasks?reminders_from=${fromDate}`)
    return response.tasks.map(mapTask)
  },

  async listLeftUndone(date) {
    const response = await request<{ tasks: Record<string, unknown>[] }>(`/tasks?undone_before=${date}`)
    return response.tasks.map(mapTask)
  },

  async createTask(input: CreateTaskInput) {
    const response = await request<{ task: Record<string, unknown> }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        day_date: input.dayDate ?? null,
        rondeled: input.rondeled ?? false,
        bucket: input.bucket ?? null,
        tag_ids: input.tagIds || [],
      }),
    })
    return mapTask(response.task)
  },

  async deleteTask(id) {
    await request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' })
  },

  async updateTask(id, input) {
    const response = await request<{ task: Record<string, unknown> }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: input.title,
        tag_ids: input.tagIds,
        note: input.note,
        flagged: input.flagged,
        reminder_time: input.reminderTime,
      }),
    })
    return mapTask(response.task)
  },

  async advanceTask(id) {
    const response = await request<{ task: Record<string, unknown> }>(`/tasks/${id}/advance`, {
      method: 'POST',
    })
    return mapTask(response.task)
  },

  async setTaskStatus(id, status, options) {
    const response = await request<{ task: Record<string, unknown> }>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, on_its_day: options?.onItsDay ?? false }),
    })
    return mapTask(response.task)
  },

  async moveTask(id, target, options) {
    const response = await request<{ task: Record<string, unknown> }>(`/tasks/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({
        day_date: target.dayDate ?? null,
        rondeled: target.rondeled ?? false,
        bucket: target.bucket ?? null,
        before_id: options?.beforeId ?? null,
        rondel: options?.rondel ?? false,
      }),
    })
    return mapTask(response.task)
  },

  async listTags() {
    const response = await request<{ tags: Tag[] }>('/tags')
    return response.tags
  },

  async createTag(input) {
    const response = await request<{ tag: Tag }>('/tags', {
      method: 'POST',
      body: JSON.stringify(snakeKeys(input)),
    })
    return response.tag
  },

  async updateTag(id, input) {
    const response = await request<{ tag: Tag }>(`/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(snakeKeys(input)),
    })
    return response.tag
  },

  async deleteTag(id) {
    await request<{ ok: boolean }>(`/tags/${id}`, { method: 'DELETE' })
  },

  async getSettings() {
    const response = await request<{ settings: UserSetting }>('/settings')
    return response.settings
  },

  async updateSettings(input) {
    const response = await request<{ settings: UserSetting }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(snakeKeys(input)),
    })
    return response.settings
  },

  async listRecurringRules() {
    const response = await request<{ rules: RecurringRule[] }>('/recurring_rules')
    return response.rules
  },

  async createRecurringRule(input: RecurringRuleInput) {
    const response = await request<{ rule: RecurringRule }>('/recurring_rules', {
      method: 'POST',
      body: JSON.stringify(snakeKeys(input)),
    })
    return response.rule
  },

  async updateRecurringRule(id, input, options) {
    const response = await request<{ rule: RecurringRule }>(`/recurring_rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...snakeKeys(input), apply_to_open_tasks: options?.applyToOpenTasks ?? false }),
    })
    return response.rule
  },

  async deleteRecurringRule(id) {
    await request<{ ok: boolean }>(`/recurring_rules/${id}`, { method: 'DELETE' })
  },

  async syncRecurring(horizonDate) {
    await request<{ ok: boolean }>('/recurring_rules/sync', {
      method: 'POST',
      body: JSON.stringify({ horizon: horizonDate }),
    })
  },
}
