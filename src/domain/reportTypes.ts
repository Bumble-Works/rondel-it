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
  completedDate: string | null
  canceledDate: string | null
  rondelCount: number
  doingRondelCount: number | null
  todoRondelCount: number | null
  plannedDays: number | null
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
  completionRate: number | null
  rondels: number
}

export interface Dashboard {
  range: ReportRange
  completedCount: number
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
