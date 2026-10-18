import { useState } from 'react'
import { formatDayLabel } from '../../domain/dates'
import { ReminderField, type ReminderScope } from '../reminders/ReminderField'
import { TaskLinks } from './TaskLinks'
import { TaskTitleField } from './TaskTitleField'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { CARRIED_FORWARD_HINT, isCarriedForward, rondelBlockedReason } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { Button } from '../../shared/ui/Button'
import { IconButton } from '../../shared/ui/IconButton'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { RondelMenu } from '../rondel/RondelMenu'
import { TagPicker } from '../tags/TagPicker'
import './TaskDetailPanel.css'

const BUCKET_LABEL: Record<string, string> = {
  'next-week': 'Next week',
  'next-month': 'Next month',
  'bucket-list': 'Bucket List',
}

interface TaskDetailPanelProps {
  task: Task
  allTags: Tag[]
  /** For a recurring task: its rule's pattern, or null if the rule was deleted. */
  repeatLabel?: string | null
  onClose: () => void
  onChangeTitle: (title: string) => void
  onToggleTag: (tagId: string) => void
  onSaveNote: (note: string) => void
  onToggleFlag: () => void
  onChangeReminder: (reminderTime: string | null, scope: ReminderScope) => void
  onAdvance: () => void
  onSetDone: () => void
  onRondel: (target: RondelTarget) => void
  onPickDate: () => void
  onDelete: () => void
  onCreateTag: (name: string) => void
  /** Creates a tag (without attaching it), for #tag in the title. */
  createTag: (name: string) => Promise<Tag | null>
  weekStartDay?: number
}

export function TaskDetailPanel({
  task,
  allTags,
  repeatLabel,
  onClose,
  onChangeTitle,
  onToggleTag,
  onSaveNote,
  onToggleFlag,
  onChangeReminder,
  onAdvance,
  onSetDone,
  onRondel,
  onPickDate,
  onDelete,
  onCreateTag,
  createTag,
  weekStartDay,
}: TaskDetailPanelProps) {
  const [note, setNote] = useState(task.note)

  const carried = isCarriedForward(task)
  const statusLocked = carried || !task.dayDate
  const firstScheduled = task.originDate ? formatDayLabel(task.originDate) : '—'
  const created = task.createdAt ? formatDayLabel(task.createdAt.slice(0, 10)) : '—'
  const where = task.dayDate
    ? formatDayLabel(task.dayDate)
    : task.bucket
      ? BUCKET_LABEL[task.bucket]
      : 'Unscheduled'


  return (
    <aside className="detail-panel" role="complementary" aria-label="Task details">
      <header className="detail-head">
        <StatusCircle
          status={task.status}
          onClick={onAdvance}
          onDoubleClick={onSetDone}
          disabled={statusLocked}
          disabledTitle={carried ? CARRIED_FORWARD_HINT : undefined}
        />
        <span className="detail-head-spacer" />
        <IconButton
          icon={task.flagged ? 'flag-filled' : 'flag'}
          label={task.flagged ? 'Remove flag' : 'Flag as important'}
          className={task.flagged ? 'detail-flag is-on' : 'detail-flag'}
          aria-pressed={task.flagged}
          disabled={carried}
          onClick={onToggleFlag}
        />
        <IconButton icon="close" label="Close" onClick={onClose} />
      </header>

      <div className="detail-body">
        <TaskTitleField
          task={task}
          allTags={allTags}
          onChangeTitle={onChangeTitle}
          onAddTag={onToggleTag}
          createTag={createTag}
        />

        <TagPicker
          className="detail-tags"
          tags={allTags}
          selectedIds={task.tagIds}
          onToggle={onToggleTag}
          onCreate={onCreateTag}
        />

        <label className="detail-field-label" htmlFor="detail-note">
          Note
        </label>
        <textarea
          id="detail-note"
          className="detail-note field"
          rows={6}
          placeholder="Add context, blockers, links…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== task.note && onSaveNote(note)}
        />

        <TaskLinks text={`${task.title}\n${note}`} />

        <ReminderField task={task} onChange={onChangeReminder} />

        <dl className="detail-meta">
          <div>
            <dt>
              <Icon name="calendar" size={15} /> Scheduled
            </dt>
            <dd>{where}</dd>
          </div>
          {task.recurringRuleId && (
            <div>
              <dt>
                <Icon name="repeat" size={15} /> Repeats
              </dt>
              <dd>{repeatLabel ?? 'Rule deleted'}</dd>
            </div>
          )}
          <div>
            <dt>
              <img src="/icon.svg" alt="" width={15} height={15} /> Rondeled
            </dt>
            <dd>{task.rondelCount === 0 ? 'Never' : `${task.rondelCount}×`}</dd>
          </div>
          <div>
            <dt>
              <Icon name="calendar" size={15} /> First scheduled
            </dt>
            <dd>{firstScheduled}</dd>
          </div>
          <div>
            <dt>
              <Icon name="note" size={15} /> Created
            </dt>
            <dd>{created}</dd>
          </div>
        </dl>
      </div>

      <footer className="detail-foot">
        {!statusLocked && (
          <Button variant="secondary" size="sm" onClick={onAdvance}>
            {task.status === 'todo' ? 'Start' : task.status === 'doing' ? 'Complete' : 'Reopen'}
          </Button>
        )}
        <div className="detail-foot-rondel">
          <RondelMenu
            onRondel={onRondel}
            onPickDate={onPickDate}
            size={26}
            weekStartDay={weekStartDay}
            disabledReason={rondelBlockedReason(task)}
            inBucketList={task.bucket !== null}
          />
        </div>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Icon name="trash" size={14} /> Delete
        </Button>
      </footer>
    </aside>
  )
}
