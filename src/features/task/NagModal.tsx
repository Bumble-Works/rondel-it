import { addDays, firstDayOfNextMonth, firstDayOfNextWeek, formatDayLabel, todayIso } from '../../domain/dates'
import type { RondelTarget } from '../../services/adapters/DataSource'
import type { Task } from '../../domain/types'
import { useAppBadge } from '../../shared/appBadge'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'
import { PillButton } from '../../shared/ui/PillButton'
import { TaskActionItem, TaskActionList } from '../../shared/ui/TaskActionItem'
import './NagModal.css'

interface NagActions {
  slot?: 'start' | 'end'
  weekStartDay: number
  onRondel: (task: Task, target: RondelTarget) => void
  onSetDone: (task: Task) => void
  onCancel: (task: Task) => void
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
  useAppBadge('nag', open)
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
          <NagList items={leftUndone} dated {...actions} />
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

/** `dated`: Next week / Next month land on that period's first day; otherwise in its Unassigned list. */
function NagList({ items, dated = false, slot = 'start', weekStartDay, onRondel, onSetDone, onCancel, onPickDate }: NagActions & { items: Task[]; dated?: boolean }) {
  const today = todayIso()
  const nextWeek = firstDayOfNextWeek(today, weekStartDay)
  const nextMonth = firstDayOfNextMonth(today)
  const later = (toDate: string) => (dated ? { toDate } : { toDate, rondeled: true })
  const landing = (toDate: string) => (dated ? `On ${formatDayLabel(toDate)}` : undefined)
  return (
    <TaskActionList>
      {items.map((task) => (
        <TaskActionItem key={task.id} task={task} detail={task.dayDate && formatDayLabel(task.dayDate)}>
          <PillButton onClick={() => onRondel(task, { toDate: slot === 'end' ? addDays(today, 1) : today })}>
            {slot === 'end' ? 'Tomorrow' : 'Today'}
          </PillButton>
          <PillButton title={landing(nextWeek)} onClick={() => onRondel(task, later(nextWeek))}>
            Next week
          </PillButton>
          <PillButton title={landing(nextMonth)} onClick={() => onRondel(task, later(nextMonth))}>
            Next month
          </PillButton>
          <PillButton aria-label="Pick a date" title="Pick a date" onClick={() => onPickDate(task)}>
            <Icon name="calendar" size={15} />
          </PillButton>
          <PillButton tone="cancel" aria-label="Cancel" title="Cancel" onClick={() => onCancel(task)}>
            <Icon name="close" size={15} />
          </PillButton>
          <PillButton tone="done" aria-label="Mark done" title="Mark done" onClick={() => onSetDone(task)}>
            <Icon name="check" size={15} />
          </PillButton>
        </TaskActionItem>
      ))}
    </TaskActionList>
  )
}
