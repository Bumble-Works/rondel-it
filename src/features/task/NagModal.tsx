import { firstDayOfNextMonth, firstDayOfNextWeek, formatDayLabel, todayIso } from '../../domain/dates'
import type { RondelTarget } from '../../services/adapters/DataSource'
import type { Task } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import './NagModal.css'

interface NagActions {
  weekStartDay: number
  onRondel: (task: Task, target: RondelTarget) => void
  onSetDone: (task: Task) => void
  onPickDate: (task: Task) => void
}

interface NagModalProps extends NagActions {
  open: boolean
  /** Rondeled items whose week/month has started. */
  waiting: Task[]
  /** Todo/doing tasks left on past days. */
  leftUndone: Task[]
  onClose: () => void
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function NagModal({ open, waiting, leftUndone, onClose, ...actions }: NagModalProps) {
  return (
    <Modal
      open={open}
      title="Don’t lose these"
      onClose={onClose}
      width={560}
      footer={
        <div className="nag-foot">
          <span className="nag-foot-note">Give each a day, rondel it on, or let it go.</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Later
          </Button>
        </div>
      }
    >
      {leftUndone.length > 0 && (
        <section className="nag-section" aria-label="Left undone on past days">
          <h3 className="nag-heading">Left undone on past days</h3>
          <p className="nag-intro">
            {plural(leftUndone.length, 'task was', 'tasks were')} never finished. Done marks it done on its day.
          </p>
          <NagList items={leftUndone} {...actions} />
        </section>
      )}
      {waiting.length > 0 && (
        <section className="nag-section" aria-label="Rondeled items waiting">
          <h3 className="nag-heading">Rondeled items waiting</h3>
          <p className="nag-intro">{plural(waiting.length, 'item is', 'items are')} waiting for a decision.</p>
          <NagList items={waiting} {...actions} />
        </section>
      )}
    </Modal>
  )
}

function NagList({ items, weekStartDay, onRondel, onSetDone, onPickDate }: NagActions & { items: Task[] }) {
  const today = todayIso()
  return (
    <ul className="nag-list">
      {items.map((task) => (
        <li key={task.id} className="nag-item">
          <div className="nag-item-main">
            <StatusCircle status={task.status} presentational size={16} />
            <div className="nag-item-text">
              <span className="nag-item-title">{task.title}</span>
              {task.dayDate && <span className="nag-item-date">{formatDayLabel(task.dayDate)}</span>}
            </div>
          </div>
          <div className="nag-item-actions">
            <button type="button" className="nag-action" onClick={() => onRondel(task, { toDate: today })}>
              Today
            </button>
            <button
              type="button"
              className="nag-action"
              onClick={() => onRondel(task, { toDate: firstDayOfNextWeek(today, weekStartDay), rondeled: true })}
            >
              Next week
            </button>
            <button
              type="button"
              className="nag-action"
              onClick={() => onRondel(task, { toDate: firstDayOfNextMonth(today), rondeled: true })}
            >
              Next month
            </button>
            <button
              type="button"
              className="nag-action"
              aria-label="Pick a date"
              title="Pick a date"
              onClick={() => onPickDate(task)}
            >
              <Icon name="calendar" size={15} />
            </button>
            <button
              type="button"
              className="nag-action nag-action--done"
              aria-label="Mark done"
              title="Mark done"
              onClick={() => onSetDone(task)}
            >
              <Icon name="check" size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
