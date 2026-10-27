import type { TaskBucket, TaskRondel, TaskStatus } from './types'

export interface ReportRange { start: string; end: string }
export interface ReportFilters {
  tagIds?: string[]
  tagMatch?: 'any' | 'all'
  includeCanceled?: boolean
}

export interface ReportFlow {
  tasks: number
  decisions: number
}

export interface ReportFlowEvent extends TaskRondel {
  direction: 'outgoing' | 'incoming' | 'within'
}

export interface ReportTaskRow {
  id: string
  lineageId: string
  title: string
  note: string
  tagIds: string[]
  status: TaskStatus
  dayDate: string | null
  rondeled: boolean
  bucket: TaskBucket | null
  scheduledInRange: boolean
  firstSeenDate: string | null
  completedDate: string | null
  canceledDate: string | null
  rondelCount: number
  doingRondelCount: number | null
  todoRondelCount: number | null
  plannedDays: number | null
  startDateSource: 'recorded' | 'history' | 'scheduled' | 'unknown'
  startedDays: number | null
  inProgressDays: number | null
  bucketListOrigin: boolean | null
  flows: ReportFlowEvent[]
  hasRecordedWork: boolean
}

export interface ReportReviewItem {
  id: string
  lineageId: string
  title: string
  note: string
  tagIds: string[]
  status: 'doing' | 'done' | 'canceled'
  carriedForward: boolean
}
export interface ReportReviewDay { date: string; items: ReportReviewItem[] }

export interface ReportDuration {
  values: number[]
  average: number | null
  median: number | null
  available: number
  total: number
}

export interface ReportTagMetric {
  id: string
  name: string
  color: string
  total: number
  done: number
  inProgress: number
  todo: number
  canceled: number
  rondels: number
}

export interface ReportTaskStatuses {
  todo: number
  doing: number
  done: number
  canceled: number
}

export interface ReportActivity extends ReportTaskStatuses { rondeled: number }

export interface ReportTimelineDay extends ReportActivity { date: string }

export interface Dashboard {
  range: ReportRange
  completedCount: number
  activity: ReportActivity
  leftBehindIds: string[]
  timeline: ReportTimelineDay[]
  bucketActivity: { created: number; actualized: number }
  summary: {
    total: number
    todo: number
    doing: number
    done: number
    canceled: number
    completionRate: number | null
  }
  completions: { day: string; value: number }[]
  tagMetrics: ReportTagMetric[]
  durations: { planned: ReportDuration; started: ReportDuration }
  rondels: {
    total: number
    todo: number
    doing: number
    unknown: number
    outcomes: { total: number; todo: number; doing: number; done: number; canceled: number }
    buckets: { label: string; count: number }[]
    flow: { outgoing: ReportFlow; incoming: ReportFlow; within: ReportFlow }
  }
  rows: ReportTaskRow[]
  review: ReportReviewDay[]
  bucketCompletions: ReportTaskRow[]
  coverage: {
    partialHistory: number
    unknownRondelSplit: number
    missingStarted: number
    unknownBucketOrigin: number
  }
}
