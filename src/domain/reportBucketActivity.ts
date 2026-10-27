import { inReportRange, isReportDate, recordedDate } from './reportDates'
import type { ReportLineage } from './reportLineage'
import type { ReportRange } from './reportTypes'

function firstActualizationDate(lineage: ReportLineage, createdAt: string | undefined): string | null {
  const events = lineage.tasks.flatMap((task) => task.bucketHistory ?? [])
  const firstScheduled = events.filter((event) => event.kind === 'scheduled')
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))[0]
  const recorded = firstScheduled ? recordedDate(firstScheduled.occurredAt) : null
  const observedFromCreation = createdAt && events.some((event) =>
    event.kind === 'added' && Date.parse(event.occurredAt) === Date.parse(createdAt))
  if (observedFromCreation) return recorded

  // A later transfer must not replace a legacy idea's earlier real-day scheduling.
  const cutoff = firstScheduled ? Date.parse(firstScheduled.occurredAt) : Infinity
  const priorTransfers = firstScheduled ? events.slice(0, events.indexOf(firstScheduled)) : events
  const realDays = [
    ...priorTransfers.filter((event) => Date.parse(event.occurredAt) <= cutoff).map((event) => event.fromDate),
    ...lineage.tasks.flatMap((task) => task.rondelHistory ?? [])
      .filter((event) => !event.fromBucket && !event.fromRondeled && Date.parse(event.occurredAt) < cutoff)
      .map((event) => event.fromDate),
    ...(!firstScheduled ? lineage.tasks.filter((task) => !task.bucket && !task.rondeled).map((task) => task.dayDate) : []),
  ].filter((date): date is string => typeof date === 'string' && isReportDate(date))
  const legacy = realDays.length ? [...realDays, ...lineage.tasks.map((task) => task.originDate)]
    .filter((date): date is string => date !== null && isReportDate(date)).sort()[0] : null
  return [recorded, legacy].filter((date): date is string => date !== null).sort()[0] ?? null
}

export function reportBucketActivity(lineages: ReportLineage[], range: ReportRange) {
  const counts = { created: 0, actualized: 0 }
  for (const lineage of lineages) {
    if (!lineage.tasks.some((task) => task.bucketListOrigin === true)) continue
    const original = [...lineage.tasks].filter((task) => Number.isFinite(Date.parse(task.createdAt)))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]
    if (original && inReportRange(recordedDate(original.createdAt), range)) counts.created++
    if (inReportRange(firstActualizationDate(lineage, original?.createdAt), range)) counts.actualized++
  }
  return counts
}
