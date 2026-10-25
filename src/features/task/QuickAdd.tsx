import { useEffect, useState } from 'react'
import type { Tag } from '../../domain/types'
import type { BoardGroupAddTarget } from '../board/WeekBoard'
import { createDataSource } from '../../services/adapters/dataSourceFactory'
import { IconButton } from '../../shared/ui/IconButton'
import { anyModalOpen } from '../../shared/ui/modalStack'
import { QuickAddModal, type QuickAddNav } from './QuickAddModal'

export type { QuickAddNav } from './QuickAddModal'

const dataSource = createDataSource()

interface QuickAddProps {
  tags: Tag[]
  weekStartDay: number
  /** Tag filters active on the board; the new task gets them too. */
  activeTagIds: string[]
  onCreateTag: (name: string) => Promise<Tag | null>
  /** After a task is filed: navigate to it and open it. */
  onAdded: (taskId: string, nav: QuickAddNav) => void
  onError: (context: string, e: unknown) => void
}

/**
 * The global "add a task" entry point: a + button (and the "n" shortcut) that
 * opens a small composer. On add it files the task, then hands back its id and
 * where it landed so the board can go there and open it — tags, a reminder or a
 * note are then one step away in the detail panel.
 */
export function QuickAdd({ tags, weekStartDay, activeTagIds, onCreateTag, onAdded, onError }: QuickAddProps) {
  const [open, setOpen] = useState(false)

  // Don't open behind another dialog (e.g. the review nag), which would steal focus.
  const openComposer = () => {
    if (!anyModalOpen()) setOpen(true)
  }

  // "n" opens the composer, unless you're typing or it's already open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      if (anyModalOpen()) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const add = (title: string, tagIds: string[], target: BoardGroupAddTarget, nav: QuickAddNav): Promise<boolean> =>
    (async () => {
      try {
        const created = await dataSource.createTask({
          title,
          dayDate: target.dayDate ?? null,
          rondeled: target.rondeled ?? false,
          bucket: target.bucket ?? null,
          tagIds: [...new Set([...activeTagIds, ...tagIds])],
        })
        onAdded(created.id, nav)
        return true
      } catch (e) {
        onError('Unable to add a task', e)
        return false
      }
    })()

  return (
    <>
      <IconButton icon="plus" label="Add a task" title="Add a task (n)" onClick={openComposer} />
      <QuickAddModal
        key={open ? 'open' : 'closed'}
        open={open}
        tags={tags}
        weekStartDay={weekStartDay}
        onCreateTag={onCreateTag}
        onAdd={add}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
