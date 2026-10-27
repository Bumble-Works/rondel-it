import { useState } from 'react'
import { addDays, firstDayOfNextMonth, firstDayOfNextWeek, formatShort, todayIso } from '../../domain/dates'
import type { Tag } from '../../domain/types'
import type { BoardGroupAddTarget } from '../board/WeekBoard'
import type { ViewKey } from '../sidebar/Sidebar'
import { HashTagMenu } from '../tags/HashTagMenu'
import { useTaskCapture } from './useTaskCapture'
import { TaskCaptureOptions } from './TaskCaptureOptions'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import './QuickAddModal.css'

type Dest = 'today' | 'tomorrow' | 'this-week' | 'next-week' | 'next-month' | 'date' | 'bucket'

/** Where to take the board after adding, so the new task is visible and open. */
export interface QuickAddNav {
  view: ViewKey
  anchorDate: string
}

const DESTS: { value: Dest; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This week' },
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
  /** Files the task; resolves true on success, false on failure (keep the draft). */
  onAdd: (title: string, tagIds: string[], target: BoardGroupAddTarget, nav: QuickAddNav, reminderTime: string | null) => Promise<boolean>
  onClose: () => void
}

/** The task's placement, where the board should go to show it, and a one-line hint. */
function resolve(
  dest: Dest,
  date: string,
  weekStartDay: number,
): { target: BoardGroupAddTarget; nav: QuickAddNav; hint: string } {
  const today = todayIso()
  switch (dest) {
    case 'today':
      return { target: { dayDate: today }, nav: { view: 'day', anchorDate: today }, hint: `Lands on Today (${formatShort(today)}).` }
    case 'tomorrow': {
      const tomorrow = addDays(today, 1)
      return { target: { dayDate: tomorrow }, nav: { view: 'day', anchorDate: tomorrow }, hint: `Lands on Tomorrow (${formatShort(tomorrow)}).` }
    }
    case 'this-week':
      return { target: { dayDate: today, rondeled: true }, nav: { view: 'week', anchorDate: today }, hint: 'Waits in this week’s Unassigned list.' }
    case 'next-week': {
      const nextWeek = firstDayOfNextWeek(today, weekStartDay)
      return { target: { dayDate: nextWeek, rondeled: true }, nav: { view: 'week', anchorDate: nextWeek }, hint: `Waits in next week’s Unassigned list (from ${formatShort(nextWeek)}).` }
    }
    case 'next-month': {
      const nextMonth = firstDayOfNextMonth(today)
      return { target: { dayDate: nextMonth, rondeled: true }, nav: { view: 'month', anchorDate: nextMonth }, hint: `Waits in next month’s Unassigned list (from ${formatShort(nextMonth)}).` }
    }
    case 'date':
      return { target: { dayDate: date }, nav: { view: 'day', anchorDate: date }, hint: date ? `Lands on ${formatShort(date)}.` : 'Pick a date.' }
    case 'bucket':
      return { target: { bucket: 'bucket-list' }, nav: { view: 'rondel', anchorDate: today }, hint: 'Kept in the Bucket List (no date).' }
  }
}

export function QuickAddModal({ open, tags, weekStartDay, onCreateTag, onAdd, onClose }: QuickAddModalProps) {
  const [dest, setDest] = useState<Dest>('today')
  const [date, setDate] = useState(() => addDays(todayIso(), 1))
  const [busy, setBusy] = useState(false)
  const canSetTime = dest === 'today' || dest === 'tomorrow' || dest === 'date'
  const input = useTaskCapture(tags, onCreateTag, canSetTime)

  const dateValid = dest !== 'date' || (date !== '' && date >= todayIso())
  const canAdd = input.text.trim() !== '' && dateValid && !busy
  const { target, nav, hint } = resolve(dest, date, weekStartDay)

  const submit = async () => {
    if (!canAdd) return
    setBusy(true)
    // Close only once the task is filed; a failed save keeps the draft to retry.
    const ok = await onAdd(input.text.trim(), input.tagIds, target, nav, input.time)
    setBusy(false)
    if (ok) onClose()
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
            // A key the suggestions used (incl. Escape to dismiss them) must not
            // reach the Modal, or Escape would also close the whole composer.
            if (input.handleKey(e)) {
              e.stopPropagation()
              return
            }
            if (e.key === 'Enter') void submit()
          }}
        />
        {input.open && <HashTagMenu anchorRef={input.inputRef} options={input.options} highlight={input.highlight} onPick={input.pick} />}
      </div>

      <div className="quickadd-tags">
        <TaskCaptureOptions input={input} tags={tags} onCreateTag={onCreateTag} canSetTime={canSetTime} />
      </div>

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
