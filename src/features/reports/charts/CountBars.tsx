import { Bar } from '@nivo/bar'
import './CountBars.css'

interface CountBarsProps {
  data: { label: string; count: number }[]
  color?: string
  label: string
}

export function CountBars({ data, color = '#5486f5', label }: CountBarsProps) {
  return (
    <div className="count-bars">
      <div aria-hidden="true">
        <Bar width={470} height={180} data={data} keys={['count']} indexBy="label"
          margin={{ top: 20, right: 10, bottom: 30, left: 10 }} padding={0.45}
          colors={[color]} borderRadius={5} enableGridY={false} enableLabel={false}
          axisLeft={null} axisBottom={{ tickSize: 0, tickPadding: 10 }}
          animate={false} isInteractive={false} />
      </div>
      <dl aria-label={label}>
        {data.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.count}</dd></div>)}
      </dl>
    </div>
  )
}
