import { Pie } from '@nivo/pie'
import type { Dashboard } from '../../../domain/reportTypes'
import { reportColors } from '../reportColors'
import './RondelOutcomes.css'

export function RondelOutcomes({ outcomes }: { outcomes: Dashboard['rondels']['outcomes'] }) {
  if (outcomes.total === 0) return <p className="report-empty-small">Nothing has rolled forward yet.</p>
  const data = [
    { id: 'Rondeled', value: outcomes.todo, color: reportColors.rondeled },
    { id: 'In progress', value: outcomes.doing, color: reportColors.doing },
    { id: 'Done', value: outcomes.done, color: reportColors.done },
    { id: 'Canceled', value: outcomes.canceled, color: reportColors.canceled },
  ]
  return (
    <div className="rondel-outcomes">
      <div className="rondel-outcomes-chart" aria-hidden="true">
        <Pie width={240} height={200} data={data.filter((item) => item.value > 0)} innerRadius={0.7}
          colors={{ datum: 'data.color' }} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}
          enableArcLinkLabels={false} enableArcLabels={false} animate={false} isInteractive={false} />
      </div>
      <dl>{data.map((item) => <div key={item.id}>
        <dt><i style={{ background: item.color }} />{item.id}</dt>
        <dd><strong>{Math.round(item.value / outcomes.total * 100)}%</strong><span>{item.value} {item.value === 1 ? 'task' : 'tasks'}</span></dd>
      </div>)}</dl>
    </div>
  )
}
