import type { Task } from './types'

/** A task left behind on its day when an in-progress copy was carried forward. */
export function isCarriedForward(task: Task): boolean {
  return task.carriedToId !== null
}

/** Done tasks and already-carried history copies can't be rondeled. */
export function canRondel(task: Task): boolean {
  return task.status !== 'done' && !isCarriedForward(task)
}

/**
 * Work in progress on a real day keeps that day's history: the source stays put
 * and a fresh "doing" copy goes to the target. Everything else just moves.
 */
export function keepsHistoryOnRondel(task: Task): boolean {
  return task.status === 'doing' && task.dayDate !== null && !task.rondeled && task.bucket === null
}
