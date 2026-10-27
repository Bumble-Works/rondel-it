import type { Dashboard } from '../../domain/reportTypes'
import { ReportSection } from './ReportSection'
import { DurationSummary } from './DurationSummary'
import { ReportHighlights } from './ReportHighlights'
import { CompletionDonut } from './charts/CompletionDonut'
import { CompletionCalendar } from './charts/CompletionCalendar'
import { TagBars } from './charts/TagBars'
import { RondelOutcomes } from './charts/RondelOutcomes'
import { ActivityTimeline } from './charts/ActivityTimeline'
import { BucketActivity } from './charts/BucketActivity'
import './ReportOverview.css'

interface ReportOverviewProps {
  dashboard: Dashboard
  collapsed: string[]
  onToggle: (section: string) => void
  calendarYear: number
  onCalendarYear: (year: number) => void
  printMode?: boolean
  hiddenTimeline?: string[]
  onHiddenTimelineChange?: (hidden: string[]) => void
  onLeftBehind?: () => void
}

export function ReportOverview({ dashboard, collapsed, onToggle, calendarYear, onCalendarYear, onLeftBehind = () => {}, printMode = false, hiddenTimeline, onHiddenTimelineChange }: ReportOverviewProps) {
  const { summary, rondels } = dashboard
  const longPrintCharts = printMode && dashboard.tagMetrics.length > 12
  const section = (id: string) => ({ collapsed: collapsed.includes(id), onToggle: () => onToggle(id) })
  return (
    <div className="report-overview">
      <ReportHighlights dashboard={dashboard} onLeftBehind={onLeftBehind} />

      <ReportSection title="A little progress, day by day" description="One day, one little step at a time." {...section('timeline')}>
        <ActivityTimeline days={dashboard.timeline} hiddenSeries={hiddenTimeline} onHiddenSeriesChange={onHiddenTimelineChange} printMode={printMode} />
      </ReportSection>

      <ReportSection title="Your little wins" description="Completions, one square at a time." {...section('calendar')}>
        <CompletionCalendar dashboard={dashboard} year={calendarYear} onYearChange={onCalendarYear} />
      </ReportSection>

      {dashboard.bucketCompletions.length > 0 && <aside className="report-bucket-celebration">
        <span aria-hidden="true">✦</span><div><strong>Someday became done.</strong><p>{dashboard.bucketCompletions.length} Bucket List {dashboard.bucketCompletions.length === 1 ? 'idea' : 'ideas'} brought into reality this period.</p></div>
      </aside>}

      <div className={`report-overview-grid${longPrintCharts ? ' report-overview-grid--long' : ''}`}>
        <ReportSection className="report-summary-chart" title="Where your list stands" description="Current status of your list." {...section('status')}>
          <CompletionDonut summary={summary} />
        </ReportSection>
        <ReportSection className="report-summary-chart" wide={longPrintCharts} title="Completion by tag" description="A little done, a little underway." {...section('tags-completed')}>
          <TagBars metrics={dashboard.tagMetrics} kind="completion" printMode={printMode} />
        </ReportSection>
        <ReportSection title="What carried forward" description="Following tasks between periods, even when they now live elsewhere." {...section('flow')}>
          <div className="report-flow">
            {([
              ['outgoing', 'Out of this period', '↗'], ['incoming', 'Into this period', '↙'], ['within', 'Within this period', '↔'],
            ] as const).map(([key, label, arrow]) => <div key={key} className={`report-flow-item report-flow-item--${key}`}>
              <span aria-hidden="true">{arrow}</span><div><strong>{rondels.flow[key].tasks} {rondels.flow[key].tasks === 1 ? 'task' : 'tasks'}</strong><p>{label}</p></div>
              <small>{rondels.flow[key].decisions} {rondels.flow[key].decisions === 1 ? 'rondel' : 'rondels'}</small>
            </div>)}
          </div>
        </ReportSection>
        <ReportSection wide={longPrintCharts} title="Where tasks keep rolling" description="The tags attached to work that has been carried forward." {...section('tags-rondels')}>
          <TagBars metrics={dashboard.tagMetrics} kind="rondels" printMode={printMode} />
        </ReportSection>
        <div className="report-overview-bottom">
          <div className="report-overview-stack">
            <ReportSection className="report-duration-chart" title="From started to completed" description="Time in progress, including pauses and waiting." {...section('started')}>
              <DurationSummary duration={dashboard.durations.started} label="Since first started" />
            </ReportSection>
            <ReportSection title="Bucket List" description="Always room for a little dreaming." {...section('bucket')}>
              <BucketActivity activity={dashboard.bucketActivity} />
            </ReportSection>
          </div>
          <ReportSection className="report-outcomes-chart" title="Where your rondeled items went" description="A little look at where they are now." {...section('outcomes')}>
            <RondelOutcomes outcomes={rondels.outcomes} />
          </ReportSection>
        </div>
      </div>
    </div>
  )
}
