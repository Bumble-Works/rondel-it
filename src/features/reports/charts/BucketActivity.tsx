import type { Dashboard } from '../../../domain/reportTypes'
import './BucketActivity.css'

export function BucketActivity({ activity }: { activity: Dashboard['bucketActivity'] }) {
  const rows = [
    { label: 'Created', count: activity.created },
    { label: 'Actualized', count: activity.actualized },
  ]
  const feedback = activity.actualized > 0 ? 'You’re making someday happen!'
    : activity.created > 0 ? 'More to look forward to!' : null
  return <div className="bucket-activity">
    <dl className="bucket-activity-chips" aria-label="Bucket List activity">
      {rows.map((row) => <div key={row.label} className={`bucket-activity-chip${row.count > 0 ? ' is-active' : ''}`}>
        <dt>{row.label}</dt><dd>{row.count}</dd>
      </div>)}
    </dl>
    {feedback && <p className="bucket-activity-feedback"><span aria-hidden="true">✦ </span>{feedback}</p>}
  </div>
}
