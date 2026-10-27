import { inReportRange, recordedDate } from './reportDates'
import type { ReportLineage } from './reportLineage'
import type { ReportRange } from './reportTypes'

export function reportBucketActivity(lineages: ReportLineage[], range: ReportRange) {
  const counts = { created: 0, actualized: 0 }
  for (const lineage of lineages) {
    if (!lineage.tasks.some((task) => task.bucketListOrigin === true)) continue
    const original = [...lineage.tasks].filter((task) => Number.isFinite(Date.parse(task.createdAt)))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]
    if (original && inReportRange(recordedDate(original.createdAt), range)) counts.created++
    const actualized = lineage.tasks.flatMap((task) => task.bucketHistory ?? [])
      .filter((event) => event.kind === 'scheduled').sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))[0]
    if (actualized) {
      if (inReportRange(recordedDate(actualized.occurredAt), range)) counts.actualized++
      continue
    }
    const observedFromCreation = original && lineage.tasks.some((task) => task.bucketHistory?.some((event) =>
      event.kind === 'added' && Date.parse(event.occurredAt) === Date.parse(original.createdAt)))
    if (observedFromCreation) continue
    // Older Bucket List ideas can retain their first scheduled calendar day.
    const hasRealDay = lineage.tasks.some((task) => !task.bucket && !task.rondeled && task.dayDate)
    if (hasRealDay) {
      const dates = lineage.tasks.flatMap((task) => task.originDate ? [task.originDate] : []).sort()
      if (inReportRange(dates[0] ?? null, range)) counts.actualized++
    }
  }
  return counts
}
