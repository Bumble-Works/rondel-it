import type { Task, TaskBucket } from './types'

/** A task left behind on its day when an in-progress copy was carried forward. */
export function isCarriedForward(task: Task): boolean {
  return task.carriedToId !== null
}

/** A reminder needs a day: not the Bucket List, a container, or a history copy. */
export function canRemind(task: Task): boolean {
  return task.dayDate !== null && !task.rondeled && !isCarriedForward(task)
}

export const CARRIED_FORWARD_HINT = 'Just a memory now. The real one rolled forward.'

export const DONE_RONDEL_HINT = 'Done — nothing left to rondel'

/** Why a task can't be rondeled, or null when it can. */
export function rondelBlockedReason(task: Task): string | null {
  if (isCarriedForward(task)) return CARRIED_FORWARD_HINT
  if (task.status === 'done') return DONE_RONDEL_HINT
  return null
}

/** Done tasks and already-carried history copies can't be rondeled. */
export function canRondel(task: Task): boolean {
  return rondelBlockedReason(task) === null
}

/**
 * Moves that schedule work rather than push it off, so they don't count as a
 * rondel: taking anything out of the Bucket List (it's being scheduled for the
 * first time, even into next week/month), or giving a rondeled item a day.
 */
export function isSchedulingDecision(
  task: Task,
  target: { dayDate: string | null; rondeled: boolean; bucket: TaskBucket | null },
): boolean {
  if (task.bucket !== null) return target.bucket === null
  return task.rondeled && target.dayDate !== null && !target.rondeled && target.bucket === null
}

/**
 * Work in progress on a real day keeps that day's history: the source stays put
 * and a fresh "doing" copy goes to the target. Everything else just moves.
 */
export function keepsHistoryOnRondel(task: Task): boolean {
  return task.status === 'doing' && task.dayDate !== null && !task.rondeled && task.bucket === null
}

/**
 * A rondeled item nags from the day its week/month starts until the user
 * decides: give it a day, rondel it on, finish it, or delete it.
 */
export function isWaitingForDecision(task: Task, today: string): boolean {
  const active = task.status === 'todo' || task.status === 'doing'
  return active && task.rondeled && task.dayDate !== null && task.dayDate <= today
}

/** A date range, inclusive, as 'YYYY-MM-DD' strings. */
export interface Period {
  start: string
  end: string
}

/** Whether a day falls within a period (inclusive). */
export function periodContainsDay(period: Period, day: string): boolean {
  return day >= period.start && day <= period.end
}

/**
 * The day a task dropped into a period's rondel container takes: the current
 * day when the period includes it (so it isn't backdated to the period's first
 * day), otherwise the period's start.
 */
export function containerDropDay(period: Period, today: string): string {
  return periodContainsDay(period, today) ? today : period.start
}

/**
 * Rondeled items shown in the viewed period's container. The period containing
 * today also shows items rondeled to earlier periods, so they aren't lost.
 */
export function showsInRondelContainer(task: Task, period: Period, today: string): boolean {
  if (!task.rondeled || !task.dayDate) return false
  const inPeriod = periodContainsDay(period, task.dayDate)
  return inPeriod || (periodContainsDay(period, today) && task.dayDate < period.start)
}

/**
 * A task still todo/doing on a day that has passed, never rondeled on. It nags
 * (separately from rondeled items) until the user decides.
 */
export function isLeftUndone(task: Task, today: string): boolean {
  const active = task.status === 'todo' || task.status === 'doing'
  return (
    active &&
    task.dayDate !== null &&
    task.dayDate < today &&
    !task.rondeled &&
    task.bucket === null &&
    !isCarriedForward(task)
  )
}
