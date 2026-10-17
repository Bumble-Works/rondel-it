export type TaskStatus = 'todo' | 'doing' | 'done' | 'canceled'

export type TaskBucket = 'bucket-list'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  /** Scheduled day (YYYY-MM-DD). Null only for a Bucket List dream. */
  dayDate: string | null
  /** Rondeled to a week/month: waits in its container until that period starts nagging. */
  rondeled: boolean
  /** Unscheduled bucket. Null when the task has a concrete dayDate. */
  bucket: TaskBucket | null
  position: number
  rondelCount: number
  /** First day this task (or its lineage) was scheduled on. For reporting. */
  originDate: string | null
  /** First task in a carry-forward lineage; null when this is the original. */
  originTaskId: string | null
  /** The task this one was carried forward from. */
  previousTaskId: string | null
  /** Set on a history copy left behind when work in progress was carried forward. */
  carriedToId: string | null
  tagIds: string[]
  note: string
  createdAt: string
  completedAt: string | null
  /** Provenance only: which recurring rule spawned this task. Not linked to siblings. */
  recurringRuleId: string | null
}

export type RecurrenceKind = 'weekly-start' | 'monthly-start' | 'weekly-on' | 'monthly-on'

export interface RecurringRule {
  id: string
  title: string
  tagIds: string[]
  note: string
  kind: RecurrenceKind
  /** 0=Sun..6=Sat, for 'weekly-on'. */
  weekday: number | null
  /** 1..31, for 'monthly-on'. */
  dayOfMonth: number | null
  createdAt: string
  /** Last occurrence date already materialized into a task. */
  lastRunDate: string | null
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface UserSetting {
  /** 0 = Sunday ... 6 = Saturday */
  weekStartDay: number
  /** Morning review time, 'HH:mm' */
  dayStartTime: string
  /** When unfinished items prompt a rondel, 'HH:mm' */
  endOfDayTime: string
  timezone: string
}
