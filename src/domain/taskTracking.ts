import type { Task } from './types'

type Tracking = Pick<Task, 'doingRondelCount' | 'startedAt' | 'bucketListOrigin' | 'canceledAt' | 'rondelHistory' | 'bucketHistory'>

/** Missing legacy observations remain unknown instead of inventing a history. */
export function taskTrackingDefaults(task: Partial<Task>): Tracking {
  return {
    doingRondelCount: task.doingRondelCount === undefined ? (task.rondelCount === 0 ? 0 : null) : task.doingRondelCount,
    startedAt: task.startedAt ?? null,
    bucketListOrigin: task.bucketListOrigin === undefined ? (task.bucket === 'bucket-list' ? true : null) : task.bucketListOrigin,
    canceledAt: task.canceledAt ?? null,
    rondelHistory: task.rondelHistory ?? [],
    bucketHistory: task.bucketHistory ?? [],
  }
}
