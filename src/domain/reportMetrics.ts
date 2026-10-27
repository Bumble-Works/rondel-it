import type { LineageEvidence } from './reportEvidence'
import { listStatusCounts, type ReportListEntry } from './reportListStatus'
import type { Dashboard, ReportActivity, ReportDuration, ReportTagMetric } from './reportTypes'
import type { Tag } from './types'

export function percentage(part: number, total: number): number | null {
  return total ? part / total * 100 : null
}

export function durationMetric(values: (number | null)[]): ReportDuration {
  const known = values.filter((value): value is number => value !== null).sort((a, b) => a - b)
  const count = known.length
  const middle = Math.floor(count / 2)
  return {
    values: known, available: count, total: values.length,
    average: count ? known.reduce((sum, days) => sum + days, 0) / count : null,
    median: count ? count % 2 ? known[middle] : (known[middle - 1] + known[middle]) / 2 : null,
  }
}

export function activityMetrics(evidence: LineageEvidence[]): ReportActivity {
  return evidence.reduce((counts, item) => {
    if (item.current && item.row.status === 'todo') counts.todo++
    if (item.current && item.row.status === 'doing') counts.doing++
    if (item.completedInRange) counts.done++
    if (item.canceledInRange) counts.canceled++
    counts.rondeled += item.decisionsInRange
    return counts
  }, { todo: 0, doing: 0, done: 0, rondeled: 0, canceled: 0 })
}

export function tagMetrics(evidence: LineageEvidence[], entries: ReportListEntry[], tags: Tag[]): ReportTagMetric[] {
  const available = [...tags, { id: '__untagged__', name: 'Untagged', color: '#94a3b8' }]
  return available.flatMap((tag) => {
    const matching = evidence.filter(({ row }) => tag.id === '__untagged__'
      ? row.tagIds.length === 0 : row.tagIds.includes(tag.id))
    const matchingEntries = entries.filter((entry) => tag.id === '__untagged__'
      ? entry.tagIds.length === 0 : entry.tagIds.includes(tag.id))
    if (!matching.length && !matchingEntries.length) return []
    const activity = listStatusCounts(matchingEntries)
    return [{ ...tag, total: activity.todo + activity.doing + activity.done + activity.canceled,
      done: activity.done, inProgress: activity.doing, todo: activity.todo, canceled: activity.canceled,
      rondels: matching.reduce((sum, item) => sum + (item.current ? item.row.rondelCount : 0), 0),
    }]
  }).sort((a, b) => b.done - a.done || b.total - a.total || a.name.localeCompare(b.name))
}

export function rondelMetrics(evidence: LineageEvidence[]): Dashboard['rondels'] {
  const rows = evidence.filter((item) => item.current).map((item) => item.row)
  const carried = rows.filter((row) => row.rondelCount > 0)
  const outcome = (status: typeof rows[number]['status']) => carried.filter((row) => row.status === status).length
  const sums = rows.reduce((result, row) => ({
    total: result.total + row.rondelCount,
    todo: result.todo + (row.todoRondelCount ?? 0),
    doing: result.doing + (row.doingRondelCount ?? 0),
    unknown: result.unknown + (row.doingRondelCount === null ? row.rondelCount : 0),
  }), { total: 0, todo: 0, doing: 0, unknown: 0 })
  const flowCount = (direction: 'outgoing' | 'incoming' | 'within') => {
    const matches = evidence.map(({ row }) => row.flows.filter((event) => event.direction === direction).length)
    return { tasks: matches.filter((count) => count > 0).length, decisions: matches.reduce((sum, count) => sum + count, 0) }
  }
  const bucket = (label: string, minimum: number, maximum: number) => ({
    label, count: rows.filter((row) => row.rondelCount >= minimum && row.rondelCount <= maximum).length,
  })
  return {
    ...sums,
    outcomes: { total: carried.length, todo: outcome('todo'), doing: outcome('doing'), done: outcome('done'), canceled: outcome('canceled') },
    buckets: [bucket('0', 0, 0), bucket('1–2', 1, 2), bucket('3–5', 3, 5), bucket('6+', 6, Infinity)],
    flow: { outgoing: flowCount('outgoing'), incoming: flowCount('incoming'), within: flowCount('within') },
  }
}
