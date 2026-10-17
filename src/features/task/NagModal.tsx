import { firstDayOfNextMonth, firstDayOfNextWeek, formatDayLabel, todayIso } from '../../domain/dates'
import type { RondelTarget } from '../../services/adapters/DataSource'
import type { Task } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import './NagModal.css'

interface NagModalProps {
  open: boolean
  items: Task[]
  weekStartDay: number
  onClose: () => void
  onRondel: (task: Task, target: RondelTarget) => void
  onSetDone: (task: Task) => void
  onPickDate: (task: Task) => void
}

export function NagModal({
  open,
  items,
  weekStartDay,
  onClose,
  onRondel,
  onSetDone,
  onPickDate,
}: NagModalProps) {
  const today = todayIso()

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
      <p className="nag-intro">
        {items.length === 1
          ? '1 parked item is waiting for a decision.'
          : `${items.length} parked items are waiting for a decision.`}
      </p>
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
              <button
                type="button"
                className="nag-action"
                onClick={() => onRondel(task, { toDate: today })}
              >
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
    </Modal>
  )
}
