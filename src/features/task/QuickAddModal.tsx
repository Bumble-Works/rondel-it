import { useState } from 'react'
import { addDays, firstDayOfNextMonth, firstDayOfNextWeek, todayIso } from '../../domain/dates'
import type { Tag } from '../../domain/types'
import type { BoardGroupAddTarget } from '../board/WeekBoard'
import { HashTagMenu } from '../tags/HashTagMenu'
import { useHashTagInput } from '../tags/useHashTagInput'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import { TagChip } from '../../shared/ui/TagChip'
import './QuickAddModal.css'

type Dest = 'today' | 'tomorrow' | 'next-week' | 'next-month' | 'date' | 'bucket'

const DESTS: { value: Dest; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next-week', label: 'Next week' },
  { value: 'next-month', label: 'Next month' },
  { value: 'date', label: 'Pick a date' },
  { value: 'bucket', label: 'Bucket List' },
]

interface QuickAddModalProps {
  open: boolean
  tags: Tag[]
  weekStartDay: number
  onCreateTag: (name: string) => Promise<Tag | null>
  onAdd: (title: string, tagIds: string[], target: BoardGroupAddTarget) => void
  onClose: () => void
}

/** Where the chosen destination lands a task, and a sentence describing it. */
function resolve(dest: Dest, date: string, weekStartDay: number): { target: BoardGroupAddTarget; hint: string } {
  const today = todayIso()
  switch (dest) {
    case 'today':
      return { target: { dayDate: today }, hint: 'Lands on Today.' }
    case 'tomorrow':
      return { target: { dayDate: addDays(today, 1) }, hint: 'Lands on Tomorrow.' }
    case 'next-week':
      return { target: { dayDate: firstDayOfNextWeek(today, weekStartDay), rondeled: true }, hint: 'Waits in next week’s Unassigned list.' }
    case 'next-month':
      return { target: { dayDate: firstDayOfNextMonth(today), rondeled: true }, hint: 'Waits in next month’s Unassigned list.' }
    case 'date':
      return { target: { dayDate: date }, hint: `Lands on ${date}.` }
    case 'bucket':
      return { target: { bucket: 'bucket-list' }, hint: 'Kept in the Bucket List (no date).' }
  }
}

export function QuickAddModal({ open, tags, weekStartDay, onCreateTag, onAdd, onClose }: QuickAddModalProps) {
  const [dest, setDest] = useState<Dest>('today')
  const [date, setDate] = useState(() => addDays(todayIso(), 1))
  const input = useHashTagInput({ tags, onCreateTag })
  const picked = input.tagIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t))

  const dateValid = dest !== 'date' || (date !== '' && date >= todayIso())
  const canAdd = input.text.trim() !== '' && dateValid
  const { target, hint } = resolve(dest, date, weekStartDay)

  const submit = () => {
    if (!canAdd) return
    onAdd(input.text.trim(), input.tagIds, target)
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Add a task"
      width={420}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canAdd} onClick={submit}>
            Add
          </Button>
        </>
      }
    >
      <div className="quickadd-field">
        <input
          {...input.inputProps}
          className="field quickadd-input"
          placeholder="What needs doing?"
          autoFocus
          onKeyDown={(e) => {
            if (input.handleKey(e)) return
            if (e.key === 'Enter') submit()
          }}
        />
        {input.open && <HashTagMenu anchorRef={input.inputRef} options={input.options} highlight={input.highlight} onPick={input.pick} />}
      </div>

      {picked.length > 0 && (
        <div className="quickadd-tags">
          {picked.map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" onRemove={() => input.removeTag(tag.id)} />
          ))}
        </div>
      )}

      <div className="quickadd-row">
        <label className="quickadd-label" htmlFor="quickadd-dest">
          Add to
        </label>
        <select
          id="quickadd-dest"
          className="field quickadd-select"
          value={dest}
          onChange={(e) => setDest(e.target.value as Dest)}
        >
          {DESTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {dest === 'date' && (
        <input
          type="date"
          className="field quickadd-date"
          aria-label="Add it on"
          min={todayIso()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      )}

      <p className="quickadd-hint">{hint}</p>
    </Modal>
  )
}
