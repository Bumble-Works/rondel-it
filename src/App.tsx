import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  addDays,
  addMonths,
  endOfMonth,
  formatDayLabel,
  formatMonthLabel,
  formatShort,
  fromIso,
  isToday,
  nowInZone,
  relativeDayLabel,
  sameMonth,
  startOfMonth,
  startOfWeek,
  todayIso,
  weekDays,
  weekdayName,
} from './domain/dates'
import type { RecurringRule, Tag, Task, TaskStatus, UserSetting } from './domain/types'
import type { BoardGroup, BoardGroupAddTarget } from './features/board/WeekBoard'
import { WeekBoard } from './features/board/WeekBoard'
import { DatePickModal } from './features/rondel/DatePickModal'
import { RecurringPage } from './features/recurring/RecurringPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { Sidebar, type ViewKey } from './features/sidebar/Sidebar'
import { NoteModal } from './features/task/NoteModal'
import { NagModal } from './features/task/NagModal'
import { TaskDetailPanel } from './features/task/TaskDetailPanel'
import { Icon } from './shared/ui/Icon'
import { Menu } from './shared/ui/Menu'
import { TagChip } from './shared/ui/TagChip'
import { isWaitingForDecision, showsInParkedContainer } from './domain/rondel'
import type { RecurringRuleInput, RondelTarget } from './services/adapters/DataSource'
import { createDataSource } from './services/adapters/dataSourceFactory'

const dataSource = createDataSource()

const VIEW_TITLE: Record<ViewKey, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  rondel: 'Bucket List',
}

interface Buckets {
  'bucket-list': Task[]
}

const EMPTY_BUCKETS: Buckets = { 'bucket-list': [] }

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
  canceled: 'Canceled',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'var(--muted)',
  doing: 'var(--status-doing)',
  done: 'var(--status-done)',
  canceled: 'var(--faint)',
}
const FILTERABLE_STATUSES: TaskStatus[] = ['todo', 'doing', 'done']

const BUCKET_DEFS: Array<[keyof Buckets, string, string]> = [['bucket-list', 'Bucket List', 'Someday']]

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function sameWeek(a: string, b: string, weekStartDay: number): boolean {
  return startOfWeek(a, weekStartDay) === startOfWeek(b, weekStartDay)
}

function App() {
  const [tags, setTags] = useState<Tag[]>([])
  const [settings, setSettings] = useState<UserSetting | null>(null)
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [rangeTasks, setRangeTasks] = useState<Task[]>([])
  const [buckets, setBuckets] = useState<Buckets>(EMPTY_BUCKETS)
  const [containerItems, setContainerItems] = useState<Task[]>([])
  const [undecided, setUndecided] = useState<Task[]>([])
  const [nagOpen, setNagOpen] = useState(false)

  const [view, setView] = useState<ViewKey>('day')
  const [anchorDate, setAnchorDate] = useState(todayIso())
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [tagMatchMode, setTagMatchMode] = useState<'any' | 'all'>('any')
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [page, setPage] = useState<'board' | 'settings' | 'recurring'>('board')

  const [noteTaskId, setNoteTaskId] = useState<string | null>(null)
  const [dateTaskId, setDateTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = todayIso()
  const weekStartDay = settings?.weekStartDay ?? 1
  const timezone = settings?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const anchorWeekStart = useMemo(
    () => startOfWeek(anchorDate, weekStartDay),
    [anchorDate, weekStartDay],
  )
  const anchorWeekEnd = useMemo(() => addDays(anchorWeekStart, 6), [anchorWeekStart])
  const monthStart = useMemo(() => startOfMonth(anchorDate), [anchorDate])
  const monthEnd = useMemo(() => endOfMonth(anchorDate), [anchorDate])

  const rangeStart = view === 'day' ? anchorDate : view === 'week' ? anchorWeekStart : monthStart
  const rangeEnd = view === 'day' ? anchorDate : view === 'week' ? anchorWeekEnd : monthEnd
  const todayInRange = today >= rangeStart && today <= rangeEnd

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const naggedRef = useRef<Set<string>>(new Set())
  const lastSeenDateRef = useRef<string | null>(null)

  const reportError = useCallback((context: string, e: unknown) => {
    console.error(`[rondel] ${context}`, e)
    setError(`${context}: ${errorMessage(e)}`)
  }, [])

  const loadBoard = useCallback(async () => {
    try {
      // Recurring tasks appear on their own day, never ahead of time — browsing
      // forward must not pre-create them.
      await dataSource.syncRecurring(nowInZone(timezone).date)
      const [range, bl, rondelItems] = await Promise.all([
        dataSource.listTasksInRange(rangeStart, rangeEnd),
        dataSource.listBucketTasks('bucket-list'),
        dataSource.listRondelItems(),
      ])
      setRangeTasks(range)
      setBuckets({ 'bucket-list': bl })

      const period = {
        start: view === 'month' ? monthStart : anchorWeekStart,
        end: view === 'month' ? monthEnd : anchorWeekEnd,
      }
      setContainerItems(rondelItems.filter((t) => showsInParkedContainer(t, period, today)))

      const undecidedItems = rondelItems.filter((t) => isWaitingForDecision(t, today))
      setUndecided(undecidedItems)

      // Nag once per app open if anything is waiting; auto-close when nothing is.
      if (undecidedItems.length === 0) {
        setNagOpen(false)
      } else if (!naggedRef.current.has('open')) {
        naggedRef.current.add('open')
        setNagOpen(true)
      }

      setError(null)
    } catch (e) {
      reportError('Unable to load tasks', e)
    }
  }, [reportError, timezone, rangeStart, rangeEnd, view, anchorWeekStart, anchorWeekEnd, monthStart, monthEnd, today])

  useEffect(() => {
    void (async () => {
      try {
        const [loadedTags, loadedSettings, loadedRules] = await Promise.all([
          dataSource.listTags(),
          dataSource.getSettings(),
          dataSource.listRecurringRules(),
        ])
        setTags(loadedTags)
        setSettings(loadedSettings)
        setRules(loadedRules)
      } catch (e) {
        reportError('Unable to load app data', e)
      }
    })()
  }, [reportError])

  useEffect(() => {
    // loadBoard only sets state after awaiting the data source; the rule can't
    // see through the async call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings) void loadBoard()
  }, [settings, loadBoard])

  /* ---- parked-items nag ---- */

  const undecidedRef = useRef<Task[]>([])
  useEffect(() => {
    undecidedRef.current = undecided
  }, [undecided])

  // Nag at begin-review and end-review times, in the user's timezone.
  // Never tied to navigation — only the clock triggers this.
  useEffect(() => {
    if (!settings) return
    const tz = settings.timezone
    const check = () => {
      const { date, time } = nowInZone(tz)
      // Past midnight: reload so the new day's recurring tasks get created.
      if (lastSeenDateRef.current !== null && date !== lastSeenDateRef.current) void loadBoard()
      lastSeenDateRef.current = date
      const slots: Array<[string, string]> = [
        ['start', settings.dayStartTime],
        ['end', settings.endOfDayTime],
      ]
      for (const [slot, at] of slots) {
        const key = `${date}-${slot}`
        if (time === at && !naggedRef.current.has(key)) {
          naggedRef.current.add(key)
          if (undecidedRef.current.length > 0) setNagOpen(true)
        }
      }
    }
    const iv = window.setInterval(check, 30000)
    return () => window.clearInterval(iv)
  }, [settings, loadBoard])

  const allTasks = useMemo(
    () => [...rangeTasks, ...containerItems, ...buckets['bucket-list'], ...undecided],
    [rangeTasks, containerItems, buckets, undecided],
  )
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null
  const noteTask = allTasks.find((t) => t.id === noteTaskId) ?? null

  /* ---- actions ---- */

  const attempt = useCallback(
    async (context: string, fn: () => Promise<unknown>) => {
      try {
        await fn()
      } catch (e) {
        reportError(context, e)
      }
    },
    [reportError],
  )

  const run = useCallback(
    (fn: () => Promise<unknown>) =>
      attempt('Something went wrong', async () => {
        await fn()
        await loadBoard()
      }),
    [attempt, loadBoard],
  )

  const quickAdd = (target: BoardGroupAddTarget, title: string) =>
    run(() =>
      dataSource.createTask({
        title,
        dayDate: target.dayDate ?? null,
        rondeled: target.rondeled ?? false,
        bucket: target.bucket ?? null,
        tagIds: [...activeTagIds],
      }),
    )

  const advance = (task: Task) => run(() => dataSource.advanceTask(task.id))
  const setDone = (task: Task) => run(() => dataSource.setTaskStatus(task.id, 'done'))
  const rondel = (task: Task, target: RondelTarget) =>
    run(() =>
      dataSource.moveTask(
        task.id,
        {
          dayDate: target.toDate ?? null,
          rondeled: target.rondeled ?? false,
          bucket: target.toBucket ?? null,
        },
        { rondel: true },
      ),
    )
  const saveNote = (taskId: string, note: string) => run(() => dataSource.updateTask(taskId, { note }))
  const changeTitle = (taskId: string, title: string) => run(() => dataSource.updateTask(taskId, { title }))
  const removeTask = (taskId: string) =>
    run(async () => {
      await dataSource.deleteTask(taskId)
      if (selectedTaskId === taskId) setSelectedTaskId(null)
      if (noteTaskId === taskId) setNoteTaskId(null)
      if (dateTaskId === taskId) setDateTaskId(null)
    })
  const move = (taskId: string, target: BoardGroupAddTarget, beforeId: string | null) =>
    run(() => dataSource.moveTask(taskId, target, { beforeId }))

  const statusOk = (t: Task) => activeStatuses.length === 0 || activeStatuses.includes(t.status)
  const tagOk = (t: Task) =>
    activeTagIds.length === 0 ||
    (tagMatchMode === 'all'
      ? activeTagIds.every((id) => t.tagIds.includes(id))
      : activeTagIds.some((id) => t.tagIds.includes(id)))
  const visible = (t: Task) => statusOk(t) && tagOk(t)
  const toggleStatus = (status: TaskStatus) =>
    setActiveStatuses((prev) => {
      const next = prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
      // Selecting every status is the same as "All statuses".
      return next.length === FILTERABLE_STATUSES.length ? [] : next
    })
  const resetStatuses = () => setActiveStatuses([])
  const toggleTagFilter = (id: string) =>
    setActiveTagIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      // In "Any" mode, selecting every tag equals "All tags" → reset.
      // In "All" mode, selecting every tag is meaningful, so keep them.
      if (tagMatchMode === 'any' && tags.length > 0 && next.length === tags.length) return []
      return next
    })
  const resetTagFilter = () => setActiveTagIds([])
  const setTagMatch = (mode: 'any' | 'all') => {
    setTagMatchMode(mode)
    // Switching to "Any" while every tag is selected is the same as "All tags".
    if (mode === 'any') {
      setActiveTagIds((prev) => (tags.length > 0 && prev.length === tags.length ? [] : prev))
    }
  }

  const toggleTag = (task: Task, tagId: string) => {
    const tagIds = task.tagIds.includes(tagId)
      ? task.tagIds.filter((id) => id !== tagId)
      : [...task.tagIds, tagId]
    return run(() => dataSource.updateTask(task.id, { tagIds }))
  }

  const createTagForTask = (task: Task, name: string) =>
    void attempt('Unable to create tag', async () => {
      const tag = await dataSource.createTag({ name })
      await dataSource.updateTask(task.id, { tagIds: [...task.tagIds, tag.id] })
      await refreshTags()
      await loadBoard()
    })

  const confirmDate = (dateIso: string) => {
    if (!dateTaskId) return
    const id = dateTaskId
    setDateTaskId(null)
    void run(() => dataSource.moveTask(id, { dayDate: dateIso }, { rondel: true }))
  }

  /* ---- settings actions ---- */

  const updateSettings = (patch: Partial<UserSetting>) =>
    void attempt('Unable to save settings', async () => {
      setSettings(await dataSource.updateSettings(patch))
    })

  const refreshTags = async () => setTags(await dataSource.listTags())
  const createTag = (name: string, color: string) =>
    void attempt('Unable to create tag', async () => {
      await dataSource.createTag({ name, color })
      await refreshTags()
      await loadBoard()
    })
  const updateTag = (id: string, patch: { name?: string; color?: string }) =>
    void attempt('Unable to update tag', async () => {
      await dataSource.updateTag(id, patch)
      await refreshTags()
      await loadBoard()
    })
  const deleteTag = (id: string) =>
    void attempt('Unable to delete tag', async () => {
      await dataSource.deleteTag(id)
      setActiveTagIds((prev) => prev.filter((x) => x !== id))
      await refreshTags()
      await loadBoard()
    })

  /* ---- recurring actions ---- */

  const refreshRules = async () => setRules(await dataSource.listRecurringRules())
  const createRule = (input: RecurringRuleInput) =>
    void attempt('Unable to create recurring task', async () => {
      await dataSource.createRecurringRule(input)
      await refreshRules()
      await loadBoard()
    })
  const updateRuleTitle = (id: string, title: string) =>
    void attempt('Unable to update recurring task', async () => {
      await dataSource.updateRecurringRule(id, { title })
      await refreshRules()
    })
  const deleteRule = (id: string) =>
    void attempt('Unable to delete recurring task', async () => {
      await dataSource.deleteRecurringRule(id)
      await refreshRules()
    })

  /* ---- groups ---- */

  const dayGroup = (iso: string): BoardGroup => {
    const dayTasks = rangeTasks.filter((t) => t.dayDate === iso && !t.rondeled && visible(t))
    return {
      key: iso,
      kind: 'day',
      title: relativeDayLabel(iso) ?? weekdayName(fromIso(iso).getDay()),
      eyebrow: formatShort(iso),
      highlight: isToday(iso),
      defaultCollapsed: view !== 'day' && todayInRange && iso > today,
      addTarget: { dayDate: iso },
      tasks: dayTasks,
      emptyLabel: 'Nothing here yet — add your first task below',
    }
  }

  const containerGroup = (): BoardGroup => ({
    key: 'rondel-container',
    kind: 'bucket',
    title: 'Unassigned',
    eyebrow: 'Rondeled',
    defaultCollapsed: false,
    addTarget: { dayDate: view === 'month' ? monthStart : anchorWeekStart, rondeled: true },
    tasks: containerItems.filter(visible),
    emptyLabel: 'Nothing parked here',
  })

  const bucketGroup = (bucket: keyof Buckets, title: string, eyebrow: string): BoardGroup => ({
    key: bucket,
    kind: 'bucket',
    title,
    eyebrow,
    addTarget: { bucket },
    tasks: buckets[bucket].filter(visible),
    emptyLabel: 'Nothing in bucket list yet',
  })

  const bucketGroups = (): BoardGroup[] =>
    BUCKET_DEFS.map(([k, t, e]) => bucketGroup(k, t, e))

  const monthDayIsos = (): string[] => {
    const days: string[] = []
    for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
      days.push(d)
    }
    return days.reverse() // newest first
  }

  const groups: BoardGroup[] = useMemo(() => {
    switch (view) {
      case 'day':
        return [containerGroup(), { ...dayGroup(anchorDate), collapsible: false }]
      case 'week':
        return [containerGroup(), ...weekDays(anchorWeekStart).slice().reverse().map(dayGroup)]
      case 'month':
        return [containerGroup(), ...monthDayIsos().map(dayGroup)]
      case 'rondel':
        return bucketGroups()
      default:
        return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, rangeTasks, buckets, containerItems, anchorWeekStart, anchorDate, monthStart, monthEnd, today, activeStatuses, activeTagIds, tagMatchMode])

  const canPage = view !== 'rondel'
  const shiftAnchor = (dir: -1 | 1) =>
    setAnchorDate((a) =>
      view === 'day'
        ? addDays(a, dir)
        : view === 'week'
          ? addDays(a, dir * 7)
          : addMonths(startOfMonth(a), dir), // from the 1st: the 31st would overflow
    )
  const isAnchorNow =
    view === 'day'
      ? anchorDate === today
      : view === 'week'
        ? sameWeek(anchorDate, today, weekStartDay)
        : view === 'month'
          ? sameMonth(anchorDate, today)
          : true

  const title =
    view === 'day' ? (relativeDayLabel(anchorDate) ?? weekdayName(fromIso(anchorDate).getDay())) : VIEW_TITLE[view]
  const subtitle =
    view === 'day'
      ? formatDayLabel(anchorDate)
      : view === 'week'
        ? `${formatShort(anchorWeekStart)} – ${formatShort(anchorWeekEnd)}`
        : view === 'month'
          ? formatMonthLabel(anchorDate)
          : 'Someday'

  if (page === 'settings' && settings) {
    return (
      <div className="app">
        {error && <p className="app-error">{error}</p>}
        <SettingsPage
          settings={settings}
          tags={tags}
          onUpdateSettings={updateSettings}
          onCreateTag={createTag}
          onUpdateTag={updateTag}
          onDeleteTag={deleteTag}
          onBack={() => setPage('board')}
        />
      </div>
    )
  }

  if (page === 'recurring') {
    return (
      <div className="app">
        {error && <p className="app-error">{error}</p>}
        <RecurringPage
          rules={rules}
          tags={tags}
          onCreate={createRule}
          onUpdateTitle={updateRuleTitle}
          onDelete={deleteRule}
          onBack={() => setPage('board')}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        activeView={view}
        onSelectView={(v) => {
          setView(v)
          setPage('board')
        }}
        counts={{}}
        tags={tags}
        activeTagIds={activeTagIds}
        onToggleTag={toggleTagFilter}
        onResetTags={resetTagFilter}
        tagMatchMode={tagMatchMode}
        onSetTagMatchMode={setTagMatch}
        activeStatuses={activeStatuses}
        onToggleStatus={toggleStatus}
        onResetStatuses={resetStatuses}
        onOpenSettings={() => setPage('settings')}
        onOpenRecurring={() => setPage('recurring')}
      />

      <main className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-titles">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="app-topbar-right">
            {activeTagIds.length > 0 || activeStatuses.length > 0 ? (
              <Menu
                align="right"
                trigger={({ onClick, 'aria-expanded': expanded }) => (
                  <button
                    type="button"
                    className={`app-filter-btn ${expanded ? 'is-open' : ''}`.trim()}
                    onClick={onClick}
                  >
                    <Icon name="filter" size={15} />
                    <span>Filters</span>
                    <span className="app-filter-count">{activeTagIds.length + activeStatuses.length}</span>
                  </button>
                )}
              >
                {(close) => (
                  <div className="filter-panel">
                    <div className="filter-panel-head">
                      <span>Active filters</span>
                      <button
                        type="button"
                        className="filter-panel-clear"
                        onClick={() => {
                          resetTagFilter()
                          resetStatuses()
                          close()
                        }}
                      >
                        Clear all
                      </button>
                    </div>

                    {activeStatuses.length > 0 && (
                      <div className="filter-panel-group">
                        <div className="filter-panel-label">Status</div>
                        <div className="filter-panel-chips">
                          {activeStatuses.map((status) => (
                            <TagChip
                              key={status}
                              name={STATUS_LABEL[status]}
                              color={STATUS_COLOR[status]}
                              onRemove={() => toggleStatus(status)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTagIds.length > 0 && (
                      <div className="filter-panel-group">
                        <div className="filter-panel-label">Tags</div>
                        <div className="filter-panel-chips">
                          {activeTagIds.map((id) => {
                            const tag = tagsById.get(id)
                            if (!tag) return null
                            return (
                              <TagChip
                                key={id}
                                name={tag.name}
                                color={tag.color}
                                onRemove={() => toggleTagFilter(id)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Menu>
            ) : null}
            {canPage && (
              <div className="app-nav">
                <button
                  type="button"
                  className="app-nav-arrow"
                  aria-label={view === 'day' ? 'Previous day' : view === 'week' ? 'Previous week' : 'Previous month'}
                  onClick={() => shiftAnchor(-1)}
                >
                  <Icon name="chevron-left" size={18} />
                </button>
                <button
                  type="button"
                  className="app-nav-today"
                  disabled={isAnchorNow}
                  onClick={() => setAnchorDate(today)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="app-nav-arrow"
                  aria-label={view === 'day' ? 'Next day' : view === 'week' ? 'Next week' : 'Next month'}
                  onClick={() => shiftAnchor(1)}
                >
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="app-scroll">
          {error && <p className="app-error">{error}</p>}

          <WeekBoard
            groups={groups}
            tagsById={tagsById}
            selectedTaskId={selectedTaskId}
            onOpen={(task) => setSelectedTaskId(task.id)}
            onAdvance={advance}
            onSetDone={setDone}
            onRondel={rondel}
            onPickDate={(task) => setDateTaskId(task.id)}
            onOpenNote={(task) => setNoteTaskId(task.id)}
            onDelete={(task) => removeTask(task.id)}
            onQuickAdd={quickAdd}
            onMove={move}
            weekStartDay={weekStartDay}
          />
        </div>
      </main>

      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          tagsById={tagsById}
          allTags={tags}
          onClose={() => setSelectedTaskId(null)}
          onChangeTitle={(title) => changeTitle(selectedTask.id, title)}
          onToggleTag={(tagId) => toggleTag(selectedTask, tagId)}
          onSaveNote={(note) => saveNote(selectedTask.id, note)}
          onAdvance={() => advance(selectedTask)}
          onSetDone={() => setDone(selectedTask)}
          onRondel={(target) => rondel(selectedTask, target)}
          onPickDate={() => setDateTaskId(selectedTask.id)}
          onDelete={() => removeTask(selectedTask.id)}
          onCreateTag={(name) => createTagForTask(selectedTask, name)}
          weekStartDay={weekStartDay}
        />
      )}

      <NoteModal
        key={noteTaskId ?? 'closed'}
        open={Boolean(noteTask)}
        task={noteTask}
        onClose={() => setNoteTaskId(null)}
        onSave={(note) => noteTask && saveNote(noteTask.id, note)}
      />


      <NagModal
        open={nagOpen && undecided.length > 0}
        items={undecided}
        weekStartDay={weekStartDay}
        onClose={() => setNagOpen(false)}
        onRondel={(task, target) => rondel(task, target)}
        onSetDone={(task) => setDone(task)}
        onPickDate={(task) => setDateTaskId(task.id)}
      />

      {/* After the nag so "Pick a date" from the nag opens on top of it. */}
      <DatePickModal key={dateTaskId ?? 'closed'} open={Boolean(dateTaskId)} onClose={() => setDateTaskId(null)} onConfirm={confirmDate} />
    </div>
  )
}

export default App
