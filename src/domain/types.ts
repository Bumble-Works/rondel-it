export type TaskStatus = 'todo' | 'doing' | 'done' | 'canceled'

export type TaskBucket = 'bucket-list'

/** One counted carry-forward decision, retained on the task it moved from. */
export interface TaskRondel {
  id: string
  occurredAt: string
  fromDate: string | null
  toDate: string | null
  fromRondeled: boolean
  toRondeled: boolean
  fromBucket: TaskBucket | null
  toBucket: TaskBucket | null
  status: TaskStatus
}

export interface TaskBucketEvent {
  id: string
  occurredAt: string
  kind: 'added' | 'scheduled'
}

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
  /** Null when earlier versions did not record the todo/doing split. */
  doingRondelCount: number | null
  /** First recorded entry into doing; preserved through carry-forward and reopening. */
  startedAt: string | null
  /** Whether this lineage began in the Bucket List; null for unknown legacy origins. */
  bucketListOrigin: boolean | null
  canceledAt: string | null
  /** Only decisions made from this record; successor copies start an empty list. */
  rondelHistory: TaskRondel[]
  /** Bucket transfers are distinct from counted rondels. Older records omit them. */
  bucketHistory?: TaskBucketEvent[]
  flagged: boolean
  /** Reminder on the task's day, 'HH:mm' (local time); null for none. */
  reminderTime: string | null
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

export type RecurrenceKind = 'weekly-start' | 'monthly-start' | 'weekly-on' | 'monthly-on' | 'repeat'

/** "On the 15th" or "on the first Monday" (nth: 1–4, or -1 for the last). */
export type MonthlyRepeat = { type: 'date'; days: number[] } | { type: 'weekday'; nth: 1 | 2 | 3 | 4 | -1; weekday: number }

/** A repeat pattern like Apple Reminders': every N days/weeks/months/years. */
export interface RepeatSpec {
  unit: 'day' | 'week' | 'month' | 'year'
  every: number
  /** 'week' only: which weekdays (0=Sun..6=Sat). */
  weekdays?: number[]
  /** 'month' only. */
  monthly?: MonthlyRepeat
  /** The first possible occurrence; anchors "every 2 weeks", the yearly date, etc. */
  startDate: string
  /** Last possible occurrence (inclusive); null repeats forever. */
  endDate: string | null
}

export interface RecurringRule {
  id: string
  title: string
  tagIds: string[]
  note: string
  kind: RecurrenceKind
  /** For kind 'repeat'. */
  repeat: RepeatSpec | null
  /** Reminder time copied onto each task the rule creates, 'HH:mm'. */
  reminderTime: string | null
  /** Each task the rule creates is flagged. */
  flagged: boolean
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
