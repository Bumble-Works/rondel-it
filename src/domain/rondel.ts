import type { Task } from './types'

/** A task left behind on its day when an in-progress copy was carried forward. */
export function isCarriedForward(task: Task): boolean {
  return task.carriedToId !== null
}

export const CARRIED_FORWARD_HINT = 'Just a memory now. The real one rolled forward.'

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

/**
 * A parked item nags from the day its week/month starts until the user
 * decides: give it a day, rondel it on, finish it, or delete it.
 */
export function isWaitingForDecision(task: Task, today: string): boolean {
  const active = task.status === 'todo' || task.status === 'doing'
  return active && task.rondeled && task.dayDate !== null && task.dayDate <= today
}

/**
 * Parked items shown in the viewed period's container. The period containing
 * today also shows items parked for earlier periods, so they aren't lost.
 */
export function showsInParkedContainer(
  task: Task,
  period: { start: string; end: string },
  today: string,
): boolean {
  if (!task.rondeled || !task.dayDate) return false
  const inPeriod = task.dayDate >= period.start && task.dayDate <= period.end
  const containsToday = today >= period.start && today <= period.end
  return inPeriod || (containsToday && task.dayDate < period.start)
}
