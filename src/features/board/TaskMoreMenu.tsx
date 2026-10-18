import { addDays, formatClock, todayIso } from '../../domain/dates'
import { canRemind, isCarriedForward } from '../../domain/rondel'
import type { Task } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { Menu, MenuItem, MenuSeparator } from '../../shared/ui/Menu'
import './TaskMoreMenu.css'

interface TaskMoreMenuProps {
  task: Task
  /** Why the menu can't open (e.g. the task is open in the side panel); null when it can. */
  disabledReason: string | null
  onCopy: (dayIso: string) => void
  onPickCopyDate: () => void
  onToggleFlag: () => void
  /** Opens the task's reminder (in the side panel). */
  onOpenReminder: () => void
  onDelete: () => void
}

/** The row's "⋯": copy, flag, reminder and delete, so the row itself stays calm. */
export function TaskMoreMenu({ task, disabledReason, onCopy, onPickCopyDate, onToggleFlag, onOpenReminder, onDelete }: TaskMoreMenuProps) {
  // A history copy is a memory: it can't be flagged.
  const canFlag = !isCarriedForward(task)

  return (
    <Menu
      trigger={({ onClick, 'aria-expanded': expanded }) => (
        <button
          type="button"
          className={`task-more-btn ${expanded ? 'is-open' : ''}`.trim()}
          aria-label="More actions"
          aria-expanded={expanded}
          title={disabledReason ?? 'More: copy, flag, reminder, delete'}
          disabled={disabledReason !== null}
          onClick={onClick}
        >
          <Icon name="dots" size={18} />
        </button>
      )}
    >
      {(close) => {
        const pick = (fn: () => void) => () => {
          fn()
          close()
        }
        return (
          <>
            <MenuItem icon={<Icon name="copy" size={16} />} onClick={pick(() => onCopy(addDays(todayIso(), 1)))}>
              Copy to tomorrow
            </MenuItem>
            <MenuItem icon={<Icon name="copy" size={16} />} onClick={pick(onPickCopyDate)}>
              Copy to a date…
            </MenuItem>
            <MenuSeparator />
            {canFlag && (
              <MenuItem icon={<Icon name={task.flagged ? 'flag-filled' : 'flag'} size={16} />} onClick={pick(onToggleFlag)}>
                {task.flagged ? 'Remove flag' : 'Flag as important'}
              </MenuItem>
            )}
            {canRemind(task) && (
              <MenuItem icon={<Icon name="bell" size={16} />} onClick={pick(onOpenReminder)}>
                {task.reminderTime ? `Reminder: ${formatClock(task.reminderTime)}` : 'Add reminder'}
              </MenuItem>
            )}
            {(canFlag || canRemind(task)) && <MenuSeparator />}
            <MenuItem tone="danger" icon={<Icon name="trash" size={16} />} onClick={pick(onDelete)}>
              Delete task
            </MenuItem>
          </>
        )
      }}
    </Menu>
  )
}
