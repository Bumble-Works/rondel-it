import { Pie } from '@nivo/pie'
import type { Dashboard } from '../../../domain/reportTypes'
import { reportColors } from '../reportColors'
import './CompletionDonut.css'

export function CompletionDonut({ summary }: { summary: Dashboard['summary'] }) {
  const data = [
    { id: 'To do', label: 'To do', value: summary.todo, color: reportColors.todo },
    { id: 'In progress', label: 'In progress', value: summary.doing, color: reportColors.doing },
    { id: 'Completed', label: 'Completed', value: summary.done, color: reportColors.done },
  ]
  return (
    <div className="completion-donut">
      <div className="completion-donut-graphic" aria-hidden="true">
        {summary.total ? <Pie
          width={240} height={210} margin={{ top: 12, right: 20, bottom: 12, left: 20 }}
          data={data.filter((item) => item.value > 0)} innerRadius={0.78} padAngle={2} cornerRadius={4}
          colors={{ datum: 'data.color' }} enableArcLinkLabels={false} enableArcLabels={false}
          animate={false} isInteractive={false}
        /> : <div className="completion-donut-empty" />}
        <div className="completion-donut-center">
          <strong>{summary.completionRate === null ? '—' : `${Math.round(summary.completionRate)}%`}</strong>
          <span>completed</span>
        </div>
      </div>
      <dl className="completion-donut-legend">
        {data.map((item) => <div key={item.id}>
          <dt><i style={{ background: item.color }} />{item.label}</dt><dd>{item.value}</dd>
        </div>)}
      </dl>
    </div>
  )
}
