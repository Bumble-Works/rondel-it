import { useEffect, useMemo, useState } from 'react'
import { todayIso } from '../../domain/dates'
import { buildDashboard } from '../../domain/reports'
import type { ReportRange } from '../../domain/reportTypes'
import type { Tag, Task } from '../../domain/types'
import type { DataSource } from '../../services/adapters/DataSource'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { ReportPrintButton } from './ReportPrintButton'
import { reportTags } from './reportPresentation'
import { ReportOverview } from './ReportOverview'
import { ReportTaskTable } from './ReportTaskTable'
import { ReportTabs, type ReportView } from './ReportTabs'
import { ReportTagFilters } from './ReportTagFilters'
import { getReportRange, reportPresets, type ReportPreset } from './reportRange'
import { reportDate } from './reportPresentation'
import { useReportTasks } from './useReportTasks'
import './ReportsPage.css'

interface ReportsPageProps {
  dataSource: DataSource
  tags: Tag[]
  revision: number
  onBack: () => void
  onError: (context: string, error: unknown) => void
  onOpenTask?: (task: Task) => void
}

export function ReportsPage({ dataSource, tags, revision, onBack, onError, onOpenTask }: ReportsPageProps) {
  const { tasks, loading, error, reload } = useReportTasks(dataSource, revision, onError)
  const today = todayIso()
  const [preset, setPreset] = useState<ReportPreset>('this-week')
  const [custom, setCustom] = useState<ReportRange>(() => getReportRange('this-week', today))
  const [tagIds, setTagIds] = useState<string[]>([])
  const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any')
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [calendarYear, setCalendarYear] = useState(Number(today.slice(0, 4)))
  const [hiddenTimeline, setHiddenTimeline] = useState<string[]>([])
  const [view, setView] = useState<ReportView>('dashboard')
  const [leftBehindOnly, setLeftBehindOnly] = useState(false)
  useEffect(() => {
    if (leftBehindOnly && view === 'tasks') document.getElementById('report-tab-tasks')?.focus()
  }, [leftBehindOnly, view])
  // Deleted tags must stop filtering an already-open report after a sync.
  const selectedTags = useMemo(() => tagIds.filter((id) => tags.some((tag) => tag.id === id)), [tagIds, tags])
  const { range, rangeError } = useMemo(() => {
    try {
      return { range: getReportRange(preset, today, custom), rangeError: null }
    } catch (cause) {
      return { range: null, rangeError: cause instanceof Error ? cause.message : String(cause) }
    }
  }, [preset, today, custom])
  const dashboard = useMemo(() => range
    ? buildDashboard(tasks, tags, range, { tagIds: selectedTags, tagMatch, includeCanceled: true }, today)
    : null, [tasks, tags, range, selectedTags, tagMatch, today])
  const year = range ? Math.max(Number(range.start.slice(0, 4)), Math.min(calendarYear, Number(range.end.slice(0, 4)))) : calendarYear
  const toggleTag = (id: string) => setTagIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
  const toggleSection = (id: string) => setCollapsed((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
  const selection = JSON.stringify([range, selectedTags, tagMatch, leftBehindOnly])
  const showLeftBehind = () => { setLeftBehindOnly(true); setView('tasks') }
  const openTask = (id: string) => {
    const task = tasks.find((item) => item.id === id)
    if (task) onOpenTask?.(task)
  }

  const outputSummary = range ? `${reportDate(range.start)} – ${reportDate(range.end)} · ${selectedTags.length
    ? `Tags (${tagMatch}): ${reportTags(selectedTags, tags)}` : 'All tags'}` : ''

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

        <div className="reports-tab-actions">
          <ReportTabs view={view} onChange={setView} />
          {view === 'dashboard' && <ReportPrintButton title="Reports — Dashboard" summary={outputSummary} disabled={loading || Boolean(error) || !dashboard}
            onError={onError} renderContent={() => dashboard && <ReportOverview dashboard={dashboard} collapsed={collapsed}
              onToggle={toggleSection} calendarYear={year} onCalendarYear={setCalendarYear} hiddenTimeline={hiddenTimeline} printMode />} />}
        </div>
        <section id="report-view-panel" className="report-view-panel" role="tabpanel" aria-labelledby={`report-tab-${view}`} tabIndex={0}>
          <ReportTagFilters tags={tags} selected={selectedTags} match={tagMatch} onToggle={toggleTag} onClear={() => setTagIds([])} onMatch={setTagMatch} />
          {loading && <p role="status">Loading your reports…</p>}
          {error && <div className="app-error" role="alert"><p>{error}</p><Button size="sm" onClick={() => void reload()}>Try again</Button></div>}
          {!loading && !error && dashboard && (view === 'dashboard' ? <>
            {dashboard.rows.length === 0 && dashboard.summary.total + dashboard.summary.canceled === 0 && dashboard.bucketActivity.created + dashboard.bucketActivity.actualized === 0 && <p className="reports-no-activity">No recorded activity in this period. Try another date range or tag.</p>}
            <ReportOverview dashboard={dashboard} collapsed={collapsed} onToggle={toggleSection} calendarYear={year} onCalendarYear={setCalendarYear} onLeftBehind={showLeftBehind} hiddenTimeline={hiddenTimeline} onHiddenTimelineChange={setHiddenTimeline} />
          </> : <>
            <header className="report-details-heading">
              <h2>{leftBehindOnly ? 'Left behind' : 'Follow each task’s story'}</h2>
              {leftBehindOnly && <Button variant="ghost" size="sm" onClick={() => setLeftBehindOnly(false)}>Show all tasks</Button>}
            </header>
            <ReportTaskTable rows={leftBehindOnly ? dashboard.rows.filter((row) => dashboard.leftBehindIds.includes(row.id)) : dashboard.rows}
              tags={tags} selection={selection} output={{ range: dashboard.range, summary: leftBehindOnly ? `${outputSummary} · Left behind only` : outputSummary,
                title: leftBehindOnly ? 'Reports — Left behind' : 'Reports — Tasks', onError }} onOpenTask={leftBehindOnly && onOpenTask ? openTask : undefined} />
          </>)}
        </section>
      </div>
    </main>
  )
}
