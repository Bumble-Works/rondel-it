import { addDays, firstDayOfNextMonth, firstDayOfNextWeek, todayIso } from '../../domain/dates'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { Icon } from '../../shared/ui/Icon'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../../shared/ui/Menu'
import './RondelMenu.css'

interface RondelMenuProps {
  onRondel: (target: RondelTarget) => void
  onPickDate: () => void
  size?: number
  weekStartDay?: number
  /** When set, the button stays in place but is disabled, with this as its tooltip. */
  disabledReason?: string | null
  /** A Bucket List item: the same options, worded as scheduling it. */
  inBucketList?: boolean
}

export function RondelMenu({
  onRondel,
  onPickDate,
  size = 22,
  weekStartDay = 1,
  disabledReason = null,
  inBucketList = false,
}: RondelMenuProps) {
  const disabled = disabledReason !== null
  return (
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
          <img src="/icon.svg" alt="" width={size} height={size} className="rondel-glyph" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>{inBucketList ? 'Schedule it for…' : 'Rondel it to…'}</MenuLabel>
          <MenuItem
            icon={<Icon name="arrow-right" size={16} />}
            onClick={() => {
              onRondel({ toDate: addDays(todayIso(), 1) })
              close()
            }}
          >
            Tomorrow
          </MenuItem>
          <MenuItem
            icon={<Icon name="calendar" size={16} />}
            onClick={() => {
              onPickDate()
              close()
            }}
          >
            Pick a date…
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Icon name="layers" size={16} />}
            onClick={() => {
              onRondel({ toDate: firstDayOfNextWeek(todayIso(), weekStartDay), rondeled: true })
              close()
            }}
          >
            Next week
          </MenuItem>
          <MenuItem
            icon={<Icon name="layers" size={16} />}
            onClick={() => {
              onRondel({ toDate: firstDayOfNextMonth(todayIso()), rondeled: true })
              close()
            }}
          >
            Next month
          </MenuItem>
          {!inBucketList && (
            <MenuItem
              icon={<Icon name="inbox" size={16} />}
              onClick={() => {
                onRondel({ toBucket: 'bucket-list' })
                close()
              }}
            >
              Bucket List
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  )
}
