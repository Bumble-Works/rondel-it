import type { RecurringRule, RepeatSpec, Tag, Task, TaskBucket, TaskStatus, UserSetting } from '../../domain/types'

export interface CreateTaskInput {
  title: string
  dayDate?: string | null
  rondeled?: boolean
  bucket?: TaskBucket | null
  tagIds?: string[]
}

export interface RondelTarget {
  toDate?: string | null
  /** When true, the task waits in the rondel container for that period. */
  rondeled?: boolean
  toBucket?: TaskBucket | null
}

export interface RecurringRuleInput {
  title: string
  tagIds?: string[]
  note?: string
  kind: RecurringRule['kind']
  weekday?: number | null
  dayOfMonth?: number | null
  reminderTime?: string | null
  flagged?: boolean
  /** For kind 'repeat'. */
  repeat?: RepeatSpec | null
}

export interface MoveOptions {
  beforeId?: string | null
  /** Counts as a rondel (carry-forward), keeping status and bumping rondelCount. */
  rondel?: boolean
}

export interface DataSource {
  /** Complete records, including Bucket List items and carried-forward history. */
  listAllTasks(): Promise<Task[]>
  listTasksInRange(startDate: string, endDate: string, tagId?: string): Promise<Task[]>
  listBucketTasks(bucket: TaskBucket, tagId?: string): Promise<Task[]>
  /** All unassigned rondel-container items (rondeled = true). */
  listRondelItems(): Promise<Task[]>
  /** Todo/doing tasks on days before `date` that were never dealt with (oldest first). */
  listLeftUndone(date: string): Promise<Task[]>
  getTask(id: string): Promise<Task>
  createTask(input: CreateTaskInput): Promise<Task>
  deleteTask(id: string): Promise<void>
  updateTask(
    id: string,
    input: { title?: string; tagIds?: string[]; note?: string; flagged?: boolean; reminderTime?: string | null },
  ): Promise<Task>
  /** Active tasks with a reminder, on `fromDate` or later. */
  listUpcomingReminders(fromDate: string): Promise<Task[]>
  advanceTask(id: string): Promise<Task>
  /**
   * `onItsDay`: marking a forgotten task done counts as done on the day it was
   * planned (it stays there, completed that day) instead of today.
   */
  setTaskStatus(id: string, status: TaskStatus, options?: { onItsDay?: boolean }): Promise<Task>
  /**
   * Put a task somewhere: a day or a bucket. Handles reorder (beforeId) and
   * carry-forward (rondel). The single way to change where a task lives.
   */
  moveTask(
    id: string,
    target: { dayDate?: string | null; rondeled?: boolean; bucket?: TaskBucket | null },
    options?: MoveOptions,
  ): Promise<Task>
  listTags(): Promise<Tag[]>
  createTag(input: { name: string; color?: string }): Promise<Tag>
  updateTag(id: string, input: { name?: string; color?: string }): Promise<Tag>
  deleteTag(id: string): Promise<void>
  getSettings(): Promise<UserSetting>
  updateSettings(input: Partial<UserSetting>): Promise<UserSetting>
  // recurring rules
  listRecurringRules(): Promise<RecurringRule[]>
  createRecurringRule(input: RecurringRuleInput): Promise<RecurringRule>
  /**
   * `applyToOpenTasks`: the rule's to-do/doing tasks also take the new title,
   * tags, note, flag and reminder (their day stays).
   */
  updateRecurringRule(
    id: string,
    input: Partial<RecurringRuleInput>,
    options?: { applyToOpenTasks?: boolean },
  ): Promise<RecurringRule>
  deleteRecurringRule(id: string): Promise<void>
  /** Materialize any due recurring occurrences up to the horizon date. */
  syncRecurring(horizonDate: string): Promise<void>
}
