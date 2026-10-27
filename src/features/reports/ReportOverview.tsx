import type { Dashboard } from '../../domain/reportTypes'
import { ReportSection } from './ReportSection'
import { DurationSummary } from './DurationSummary'
import { CompletionDonut } from './charts/CompletionDonut'
import { CompletionCalendar } from './charts/CompletionCalendar'
import { CountBars } from './charts/CountBars'
import { TagBars } from './charts/TagBars'
import './ReportOverview.css'

interface ReportOverviewProps {
  dashboard: Dashboard
  collapsed: string[]
  onToggle: (section: string) => void
  calendarYear: number
  onCalendarYear: (year: number) => void
}

export function ReportOverview({ dashboard, collapsed, onToggle, calendarYear, onCalendarYear }: ReportOverviewProps) {
  const { summary, rondels, coverage } = dashboard
  const section = (id: string) => ({ collapsed: collapsed.includes(id), onToggle: () => onToggle(id) })
  return (
    <div className="report-overview">
      <div className="report-highlights">
        <div className="report-highlight report-highlight--green"><span>Completed in this period</span><strong>{dashboard.completedCount}</strong><small>Things you brought to done</small></div>
        <div className="report-highlight"><span>On this period’s list</span><strong>{summary.total}</strong><small>Currently scheduled tasks</small></div>
        <div className="report-highlight report-highlight--amber"><span>Carried out</span><strong>{rondels.flow.outgoing.tasks}</strong><small>Tasks moved beyond this period</small></div>
        <div className="report-highlight report-highlight--purple"><span>Let go</span><strong>{summary.canceled}</strong><small>Canceled, with their story kept</small></div>
      </div>

      {dashboard.bucketCompletions.length > 0 && <aside className="report-bucket-celebration">
        <span aria-hidden="true">✦</span><div><strong>Someday became done.</strong><p>{dashboard.bucketCompletions.length} Bucket List {dashboard.bucketCompletions.length === 1 ? 'idea' : 'ideas'} brought into reality this period.</p></div>
      </aside>}

      <div className="report-overview-grid">
        <ReportSection title="Where your list stands" description="Current status of tasks scheduled on real days in this period." {...section('status')}>
          <CompletionDonut summary={summary} />
        </ReportSection>
        <ReportSection title="What carried forward" description="Following tasks between periods, even when they now live elsewhere." {...section('flow')}>
          <div className="report-flow">
            {([
              ['outgoing', 'Out of this period', '↗'], ['incoming', 'Into this period', '↙'], ['within', 'Within this period', '↔'],
            ] as const).map(([key, label, arrow]) => <div key={key} className={`report-flow-item report-flow-item--${key}`}>
              <span aria-hidden="true">{arrow}</span><div><strong>{rondels.flow[key].tasks} tasks</strong><p>{label}</p></div>
              <small>{rondels.flow[key].decisions} {rondels.flow[key].decisions === 1 ? 'rondel' : 'rondels'}</small>
            </div>)}
          </div>
          <p className="report-caption">Based on the dates tasks moved from and to. Scheduling a waiting item for its first real day is not a rondel.</p>
          {coverage.partialHistory > 0 && <p className="report-history-note">Some older moves weren’t dated. These movement counts show the history available.</p>}
        </ReportSection>
        <ReportSection title="A little progress, day by day" description="Completions on the dates they were recorded as done." wide {...section('calendar')}>
          <CompletionCalendar dashboard={dashboard} year={calendarYear} onYearChange={onCalendarYear} />
        </ReportSection>
        <ReportSection title="Completion by tag" description="Completed / scheduled tasks, with the completion percentage." {...section('tags-completed')}>
          <TagBars metrics={dashboard.tagMetrics} kind="completion" />
        </ReportSection>
        <ReportSection title="Where tasks keep rolling" description="The tags attached to work that has been carried forward." {...section('tags-rondels')}>
          <TagBars metrics={dashboard.tagMetrics} kind="rondels" />
        </ReportSection>
        <ReportSection title="From planned to completed" description="Time on your list before reaching done." {...section('planned')}>
          <DurationSummary duration={dashboard.durations.planned} label="Since first scheduled" />
        </ReportSection>
        <ReportSection title="From started to completed" description="Time in progress, including pauses and waiting." {...section('started')}>
          <DurationSummary duration={dashboard.durations.started} label="Since first started" />
        </ReportSection>
        <ReportSection title="How often tasks roll forward" description="Lifetime rondels for the tasks relevant to this period." {...section('rondel-buckets')}>
          <CountBars data={rondels.buckets} label="Tasks by lifetime rondel count" color="#e9a44e" />
          <p className="report-caption">Zero means never rondeled; it does not imply the task was quick.</p>
        </ReportSection>
        <ReportSection title="Before starting, or already in progress?" description="The kind of work you carry forward." {...section('rondel-split')}>
          <dl className="report-split">
            <div><dt>While to do</dt><dd>{rondels.todo}</dd></div>
            <div><dt>While in progress</dt><dd>{rondels.doing}</dd></div>
            {rondels.unknown > 0 && <div><dt>Older, unknown status</dt><dd>{rondels.unknown}</dd></div>}
          </dl>
          <p className="report-caption">{rondels.total} lifetime rondels across these tasks. Each task’s chain counts once.</p>
        </ReportSection>
      </div>
    </div>
  )
}
