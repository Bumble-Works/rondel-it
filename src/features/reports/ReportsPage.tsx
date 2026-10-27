import { useMemo, useState } from 'react'
import { todayIso } from '../../domain/dates'
import { buildDashboard } from '../../domain/reports'
import type { ReportRange } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import type { DataSource } from '../../services/adapters/DataSource'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { ReportOverview } from './ReportOverview'
import { getReportRange, reportPresets, type ReportPreset } from './reportRange'
import { reportDate } from './reportPresentation'
import { useReportTasks } from './useReportTasks'
import './ReportsPage.css'

interface ReportsPageProps {
  dataSource: DataSource
  tags: Tag[]
  weekStartDay: number
  revision: number
  onBack: () => void
  onError: (context: string, error: unknown) => void
}

export function ReportsPage({ dataSource, tags, weekStartDay, revision, onBack, onError }: ReportsPageProps) {
  const { tasks, loading, error, reload } = useReportTasks(dataSource, revision, onError)
  const today = todayIso()
  const [preset, setPreset] = useState<ReportPreset>('past-14-days')
  const [custom, setCustom] = useState<ReportRange>(() => getReportRange('past-14-days', today, weekStartDay))
  const [tagIds, setTagIds] = useState<string[]>([])
  const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any')
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [calendarYear, setCalendarYear] = useState(Number(today.slice(0, 4)))
  // Deleted tags must stop filtering an already-open report after a sync.
  const selectedTags = useMemo(() => tagIds.filter((id) => tags.some((tag) => tag.id === id)), [tagIds, tags])
  const { range, rangeError } = useMemo(() => {
    try {
      return { range: getReportRange(preset, today, weekStartDay, custom), rangeError: null }
    } catch (cause) {
      return { range: null, rangeError: cause instanceof Error ? cause.message : String(cause) }
    }
  }, [preset, today, weekStartDay, custom])
  const dashboard = useMemo(() => range
    ? buildDashboard(tasks, tags, range, { tagIds: selectedTags, tagMatch, includeCanceled: true }, today)
    : null, [tasks, tags, range, selectedTags, tagMatch, today])
  const year = range ? Math.max(Number(range.start.slice(0, 4)), Math.min(calendarYear, Number(range.end.slice(0, 4)))) : calendarYear
  const toggleTag = (id: string) => setTagIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
  const toggleSection = (id: string) => setCollapsed((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])

  return (
    <main className="reports-page">
      <div className="reports-inner">
        <Button variant="ghost" size="sm" onClick={onBack}><Icon name="chevron-left" size={15} /> Back to your list</Button>
        <header className="reports-heading">
          <div><p className="reports-eyebrow">A little perspective</p><h1>Reports</h1><p>Your progress, and the work you carried forward.</p></div>
          <div className="reports-range-controls">
            <label className="reports-range-label">Period
              <select value={preset} onChange={(event) => {
                const next = event.target.value as ReportPreset
                if (next === 'custom' && range) setCustom(range)
                setPreset(next)
              }}>
                {reportPresets.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {preset === 'custom' && <>
              <div className="reports-custom-range">
                <label>From<input type="date" aria-describedby="reports-range-hint" value={custom.start} onChange={(event) => setCustom({ ...custom, start: event.target.value })} /></label>
                <label>Through<input type="date" aria-describedby="reports-range-hint" value={custom.end} onChange={(event) => setCustom({ ...custom, end: event.target.value })} /></label>
              </div>
              <p id="reports-range-hint" className="reports-period">Choose up to one year, including both dates. You can report on any past year.</p>
            </>}
            {rangeError && <p role="alert" className="app-error">{rangeError}</p>}
            {preset !== 'custom' && !loading && !error && dashboard && <p className="reports-period">{reportDate(dashboard.range.start)} – {reportDate(dashboard.range.end)}</p>}
          </div>
        </header>

        {tags.length > 0 && <section className="reports-tag-filter" aria-label="Filter reports by tag">
          <div className="reports-tag-actions">
            <span>Focus on</span>
            <Button size="sm" variant="ghost" aria-pressed={selectedTags.length === 0} onClick={() => setTagIds([])}>All tags</Button>
            {selectedTags.length > 1 && <label>Match
              <select value={tagMatch} onChange={(event) => setTagMatch(event.target.value as 'any' | 'all')}>
                <option value="any">Any selected tag</option><option value="all">All selected tags</option>
              </select>
            </label>}
          </div>
          <div className="reports-tag-buttons">{tags.map((tag) => <button key={tag.id} type="button"
            aria-pressed={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
            <i style={{ background: tag.color }} />#{tag.name}
          </button>)}</div>
        </section>}

        {loading && <p role="status">Loading your reports…</p>}
        {error && <div className="app-error" role="alert"><p>{error}</p><Button size="sm" onClick={() => void reload()}>Try again</Button></div>}
        {!loading && !error && dashboard && <>
          {dashboard.rows.length === 0 && <p className="reports-no-activity">No recorded activity in this period. Try another date range or tag.</p>}
          <ReportOverview dashboard={dashboard} collapsed={collapsed} onToggle={toggleSection} calendarYear={year} onCalendarYear={setCalendarYear} />
        </>}
      </div>
    </main>
  )
}
