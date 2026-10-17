import { useState } from 'react'
import { formatDayLabel } from '../../domain/dates'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { CARRIED_FORWARD_HINT, isCarriedForward, rondelBlockedReason } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { Button } from '../../shared/ui/Button'
import { IconButton } from '../../shared/ui/IconButton'
import { Menu, MenuItem, MenuLabel } from '../../shared/ui/Menu'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { TagChip } from '../../shared/ui/TagChip'
import { RondelMenu } from '../rondel/RondelMenu'
import './TaskDetailPanel.css'

const BUCKET_LABEL: Record<string, string> = {
  'next-week': 'Next week',
  'next-month': 'Next month',
  'bucket-list': 'Bucket List',
}

interface TaskDetailPanelProps {
  task: Task
  tagsById: Map<string, Tag>
  allTags: Tag[]
  onClose: () => void
  onChangeTitle: (title: string) => void
  onToggleTag: (tagId: string) => void
  onSaveNote: (note: string) => void
  onAdvance: () => void
  onSetDone: () => void
  onRondel: (target: RondelTarget) => void
  onPickDate: () => void
  onDelete: () => void
  onCreateTag: (name: string) => void
  weekStartDay?: number
}

export function TaskDetailPanel({
  task,
  tagsById,
  allTags,
  onClose,
  onChangeTitle,
  onToggleTag,
  onSaveNote,
  onAdvance,
  onSetDone,
  onRondel,
  onPickDate,
  onDelete,
  onCreateTag,
  weekStartDay,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [newTag, setNewTag] = useState('')

  const tags = task.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => Boolean(t))
  const carried = isCarriedForward(task)
  const statusLocked = carried || !task.dayDate
  const firstScheduled = task.originDate ? formatDayLabel(task.originDate) : '—'
  const created = task.createdAt ? formatDayLabel(task.createdAt.slice(0, 10)) : '—'
  const where = task.dayDate
    ? formatDayLabel(task.dayDate)
    : task.bucket
      ? BUCKET_LABEL[task.bucket]
      : 'Unscheduled'

  const commitTitle = () => {
    const next = title.trim()
    if (next && next !== task.title) onChangeTitle(next)
    else setTitle(task.title)
  }

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
        <IconButton icon="close" label="Close" onClick={onClose} />
      </header>

      <div className="detail-body">
        <textarea
          className="detail-title"
          rows={2}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
        />

        <div className="detail-tags">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onRemove={() => onToggleTag(tag.id)}
            />
          ))}
          <Menu
            align="left"
            trigger={({ onClick, 'aria-expanded': expanded }) => (
              <button
                type="button"
                className={`detail-add-tag ${expanded ? 'is-open' : ''}`.trim()}
                onClick={onClick}
              >
                <Icon name="plus" size={14} /> Tag
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>Toggle tags</MenuLabel>
                {allTags.map((tag) => {
                  const on = task.tagIds.includes(tag.id)
                  return (
                    <MenuItem
                      key={tag.id}
                      icon={<span className="detail-tag-swatch" style={{ background: tag.color }} />}
                      onClick={() => {
                        onToggleTag(tag.id)
                        close()
                      }}
                    >
                      {tag.name}
                      {on && <Icon name="check" size={15} />}
                    </MenuItem>
                  )
                })}
                <div className="detail-tag-create">
                  <input
                    className="detail-tag-create-input"
                    placeholder="Create a tag…"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        onCreateTag(newTag.trim())
                        setNewTag('')
                        close()
                      }
                    }}
                  />
                </div>
              </>
            )}
          </Menu>
        </div>

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

        <dl className="detail-meta">
          <div>
            <dt>
              <Icon name="calendar" size={15} /> Scheduled
            </dt>
            <dd>{where}</dd>
          </div>
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
          />
        </div>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Icon name="trash" size={14} /> Delete
        </Button>
      </footer>
    </aside>
  )
}
