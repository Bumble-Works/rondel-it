import { formatDayLabel } from '../../domain/dates'
import type { BoardGroup } from '../board/WeekBoard'
import type { PrintSection } from './PrintSheet'

/**
 * The view's sections, for paper: those with tasks, days in calendar order
 * (the board lists newest first). A week or month always heads each day; a
 * single section (one day, the Bucket List) has no heading.
 */
export function printView(groups: BoardGroup[], byDay: boolean): { sections: PrintSection[]; showHeadings: boolean } {
  const days = groups.filter((g) => g.kind === 'day').sort((a, b) => a.key.localeCompare(b.key))
  const sections = [...groups.filter((g) => g.kind !== 'day'), ...days]
    .filter((g) => g.tasks.length > 0)
    .map((g) => ({ key: g.key, heading: g.kind === 'day' ? formatDayLabel(g.key) : g.title, tasks: g.tasks }))
  return { sections, showHeadings: byDay || sections.length > 1 }
}
