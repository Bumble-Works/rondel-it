import { useState, type ReactNode } from 'react'
import { addDays, firstDayOfNextMonth, firstDayOfNextWeek, formatDayLabel, todayIso } from '../../domain/dates'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { ChoiceModal } from '../../shared/ui/ChoiceModal'
import { Icon, type IconName } from '../../shared/ui/Icon'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../../shared/ui/Menu'
import './RondelMenu.css'
import { APP_ICON } from '../../shared/assets'

interface RondelMenuProps {
  onRondel: (target: RondelTarget) => void
  onPickDate: () => void
  size?: number
  weekStartDay?: number
  /** When set, the button stays in place but is disabled, with this as its tooltip. */
  disabledReason?: string | null
  /** A Bucket List item: the same options, worded as scheduling it. */
  inBucketList?: boolean
  /** A doing task on a day: taking its day away ("No day yet") asks first. */
  inProgress?: boolean
  /** The day the task is scheduled on, if any: a dated item for that same day is disabled. */
  currentDay?: string | null
}

/** A "No day yet" choice waiting for the in-progress confirmation. */
interface PendingMove {
  target: RondelTarget
  /** Completes "Move it to …?" */
  destination: string
}

export function RondelMenu({
  onRondel,
  onPickDate,
  size = 22,
  weekStartDay = 1,
  disabledReason = null,
  inBucketList = false,
  inProgress = false,
  currentDay = null,
}: RondelMenuProps) {
  const [pending, setPending] = useState<PendingMove | null>(null)
  const disabled = disabledReason !== null
  const today = todayIso()
  const nextWeek = firstDayOfNextWeek(today, weekStartDay)
  const nextMonth = firstDayOfNextMonth(today)
  const tomorrow = addDays(today, 1)

  const moveWithoutDay = (move: PendingMove) => (inProgress ? setPending(move) : onRondel(move.target))

  return (
    <>
      <Menu
        align="right"
        trigger={({ onClick, 'aria-expanded': expanded }) => (
          <button
            type="button"
            className={`rondel-trigger ${expanded ? 'is-open' : ''}`.trim()}
            aria-label={inBucketList ? 'Schedule this task' : 'Rondel this task'}
            title={disabledReason ?? (inBucketList ? 'Schedule it — give it a day' : 'Rondel — move it forward')}
            disabled={disabled}
            onClick={onClick}
          >
            <img src={APP_ICON} alt="" width={size} height={size} className="rondel-glyph" />
          </button>
        )}
      >
        {(close) => {
          const item = (icon: IconName, label: ReactNode, action: () => void, disabledTitle?: string) => (
            <MenuItem
              icon={<Icon name={icon} size={16} />}
              disabled={disabledTitle !== undefined}
              title={disabledTitle}
              onClick={() => {
                action()
                close()
              }}
            >
              {label}
            </MenuItem>
          )
          // Moving a task onto its own day would count a rondel (and copy a doing task) for no move.
          const dated = (label: string, toDate: string) =>
            item('arrow-right', label, () => onRondel({ toDate }),
              toDate === currentDay ? `Already on ${formatDayLabel(toDate)}` : undefined)
          return (
            <>
              <MenuLabel>{inBucketList ? 'Schedule it for…' : 'Rondel it to…'}</MenuLabel>
              {dated('Tomorrow', tomorrow)}
              {dated(`Next week · ${formatDayLabel(nextWeek)}`, nextWeek)}
              {dated(`Next month · ${formatDayLabel(nextMonth)}`, nextMonth)}
              {item('calendar', 'Pick a date…', onPickDate)}
              <MenuSeparator />
              <MenuLabel>No day yet</MenuLabel>
              {item('layers', 'Next week’s Unassigned', () =>
                moveWithoutDay({ target: { toDate: nextWeek, rondeled: true }, destination: 'next week’s Unassigned list' }),
              )}
              {item('layers', 'Next month’s Unassigned', () =>
                moveWithoutDay({ target: { toDate: nextMonth, rondeled: true }, destination: 'next month’s Unassigned list' }),
              )}
              {!inBucketList &&
                item('inbox', 'Bucket List', () =>
                  moveWithoutDay({ target: { toBucket: 'bucket-list' }, destination: 'the Bucket List' }),
                )}
            </>
          )
        }}
      </Menu>
      <ChoiceModal
        open={pending !== null}
        title="Move an in-progress task?"
        message={`This task is in progress. Move it to ${pending?.destination ?? ''}?`}
        choices={[{ value: 'move', label: 'Move', primary: true }]}
        onChoose={() => {
          if (pending) onRondel(pending.target)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
