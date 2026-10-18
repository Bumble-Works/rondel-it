import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  addDays,
  addMonths,
  dayTitle,
  endOfMonth,
  formatDayLabel,
  formatMonthLabel,
  formatShort,
  fromIso,
  isToday,
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
import { useScrollToToday } from './features/board/useScrollToToday'
import { DatePickModal } from './features/rondel/DatePickModal'
import { RecurringPage } from './features/recurring/RecurringPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { Sidebar, type ViewKey } from './features/sidebar/Sidebar'
import { NoteModal } from './features/task/NoteModal'
import { NagModal } from './features/task/NagModal'
import { TaskDetailPanel } from './features/task/TaskDetailPanel'
import { Icon } from './shared/ui/Icon'
import { IconButton } from './shared/ui/IconButton'
import { Menu } from './shared/ui/Menu'
import { TagChip } from './shared/ui/TagChip'
import { isWaitingForDecision, showsInRondelContainer } from './domain/rondel'
import type { RecurringRuleInput, RondelTarget } from './services/adapters/DataSource'
import { createDataSource } from './services/adapters/dataSourceFactory'
import { useSync } from './features/sync/useSync'
import { restoreMenuBarIcon } from './shared/startAtLogin'
import { PrintSheet } from './features/print/PrintSheet'
import { printView } from './features/print/printView'
import { printPage } from './features/print/printPage'
import { useSchedule } from './features/reminders/useSchedule'
import { notify } from './shared/notify'

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
  // Active tasks with a reminder, today or later (for the reminder schedule).
  const [reminderTasks, setReminderTasks] = useState<Task[]>([])
  // Todo/doing tasks left on past days: nag alongside rondeled items.
  const [leftUndone, setLeftUndone] = useState<Task[]>([])
  const [nagOpen, setNagOpen] = useState(false)

  const [view, setView] = useState<ViewKey>('day')
  const [anchorDate, setAnchorDate] = useState(todayIso())
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [tagMatchMode, setTagMatchMode] = useState<'any' | 'all'>('any')
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [page, setPage] = useState<'board' | 'settings' | 'recurring'>('board')
  // Narrow windows show the sidebar as a drawer (see App.css / Sidebar.css).
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // The last Print: the whole view, or one day of it. The sheet stays mounted
  // (hidden on screen) so the print dialog always has it, however long it stays open.
  const [printRequest, setPrintRequest] = useState<{ dayIso: string | null; at: number } | null>(null)

  const [noteTaskId, setNoteTaskId] = useState<string | null>(null)
  const [dateTaskId, setDateTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = todayIso()
  const weekStartDay = settings?.weekStartDay ?? 1

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
  // The day recurring tasks were last created for. Browsing (which reloads the
  // board a lot) reuses it; any change resets it, since finishing a "start of
  // week/month" task is what lets the next one be created.
  const recurringSyncedFor = useRef<string | null>(null)

  const reportError = useCallback((context: string, e: unknown) => {
    console.error(`[rondel] ${context}`, e)
    setError(`${context}: ${errorMessage(e)}`)
  }, [])

  const loadBoard = useCallback(async () => {
    try {
      // Recurring tasks appear on their own day, never ahead of time — browsing
      // forward must not pre-create them.
      // The device's own day, like the board, the review times and midnight.
      const recurringDay = today
      if (recurringSyncedFor.current !== recurringDay) {
        await dataSource.syncRecurring(recurringDay)
        recurringSyncedFor.current = recurringDay
      }
      const [range, bl, rondelItems, withReminders, leftItems] = await Promise.all([
        dataSource.listTasksInRange(rangeStart, rangeEnd),
        dataSource.listBucketTasks('bucket-list'),
        dataSource.listRondelItems(),
        dataSource.listUpcomingReminders(today),
        dataSource.listLeftUndone(today),
      ])
      setReminderTasks(withReminders)
      setRangeTasks(range)
      setBuckets({ 'bucket-list': bl })

      const period = {
        start: view === 'month' ? monthStart : anchorWeekStart,
        end: view === 'month' ? monthEnd : anchorWeekEnd,
      }
      setContainerItems(rondelItems.filter((t) => showsInRondelContainer(t, period, today)))

      const undecidedItems = rondelItems.filter((t) => isWaitingForDecision(t, today))
      setUndecided(undecidedItems)
      setLeftUndone(leftItems)

      // Nag once per app open if anything is waiting; auto-close when nothing is.
      if (undecidedItems.length + leftItems.length === 0) {
        setNagOpen(false)
      } else if (!naggedRef.current.has('open')) {
        naggedRef.current.add('open')
        setNagOpen(true)
      }

      setError(null)
    } catch (e) {
      reportError('Unable to load tasks', e)
    }
  }, [reportError, rangeStart, rangeEnd, view, anchorWeekStart, anchorWeekEnd, monthStart, monthEnd, today])

  /** Tags, settings and rules; the board reloads itself when settings change. */
  const loadAppData = useCallback(async () => {
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
  }, [reportError])

  useEffect(() => {
    // Sets state only after awaiting the data source (same as loadBoard below).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAppData()
  }, [loadAppData])

  // The menu-bar icon shows while "Start at login" is on.
  useEffect(() => {
    restoreMenuBarIcon().catch((e) => reportError('Couldn’t show the menu-bar icon', e))
  }, [reportError])

  const sync = useSync({
    onRemoteChange: useCallback(() => {
      recurringSyncedFor.current = null // another device may have changed rules
      void loadAppData().then(() => loadBoard())
    }, [loadAppData, loadBoard]),
    reportError,
  })
  const { scheduleSync } = sync

  useEffect(() => {
    // loadBoard only sets state after awaiting the data source; the rule can't
    // see through the async call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings) void loadBoard()
  }, [settings, loadBoard])

  useScrollToToday((view === 'week' || view === 'month') && todayInRange, `${view}:${rangeStart}`)

  // Print once the sheet has rendered.
  useEffect(() => {
    if (!printRequest) return
    const frame = requestAnimationFrame(() => {
      printPage().catch((e) => reportError('Couldn’t open the print dialog', e))
    })
    return () => cancelAnimationFrame(frame)
  }, [printRequest, reportError])

  /* ---- nag: rondeled items waiting + tasks left undone on past days ---- */

  const nagCount = undecided.length + leftUndone.length
  const nagCountRef = useRef(0)
  useEffect(() => {
    nagCountRef.current = nagCount
  }, [nagCount])

  // Review times, task reminders and midnight fire on time, even while hidden.
  useSchedule({
    reminders: reminderTasks,
    settings,
    onReview: (slot) => {
      const count = nagCountRef.current
      if (count === 0) return
      setNagOpen(true)
      const name = slot === 'start' ? 'Morning review' : 'End-of-day review'
      void notify(name, `${count} ${count === 1 ? 'thing needs' : 'things need'} a decision`)
    },
    // The new day's recurring tasks are created when the board reloads.
    onNewDay: () => void loadBoard(),
  })

  const allTasks = useMemo(
    () => [...rangeTasks, ...containerItems, ...buckets['bucket-list'], ...undecided, ...leftUndone],
    [rangeTasks, containerItems, buckets, undecided, leftUndone],
  )
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null
  const noteTask = allTasks.find((t) => t.id === noteTaskId) ?? null

  /* ---- actions ---- */

  const attempt = useCallback(
    async (context: string, fn: () => Promise<unknown>) => {
      try {
        recurringSyncedFor.current = null
        await fn()
        scheduleSync()
      } catch (e) {
        reportError(context, e)
      }
    },
    [reportError, scheduleSync],
  )

  const run = useCallback(
    (fn: () => Promise<unknown>) =>
      attempt('Something went wrong', async () => {
        await fn()
        await loadBoard()
      }),
    [attempt, loadBoard],
  )

  const quickAdd = (target: BoardGroupAddTarget, title: string, tagIds: string[]) =>
    run(() =>
      dataSource.createTask({
        title,
        dayDate: target.dayDate ?? null,
        rondeled: target.rondeled ?? false,
        bucket: target.bucket ?? null,
        tagIds: [...new Set([...activeTagIds, ...tagIds])],
      }),
    )

  /** Creates a tag the user explicitly chose to create while typing #name. */
  const createTagNamed = async (name: string): Promise<Tag | null> => {
    try {
      const tag = await dataSource.createTag({ name })
      await refreshTags()
      return tag
    } catch (e) {
      reportError('Unable to create tag', e)
      return null
    }
  }

  const advance = (task: Task) => run(() => dataSource.advanceTask(task.id))
  const setDone = (task: Task, options?: { onItsDay?: boolean }) =>
    run(() => dataSource.setTaskStatus(task.id, 'done', options))
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
  const toggleFlag = (task: Task) => run(() => dataSource.updateTask(task.id, { flagged: !task.flagged }))
  // "All" on a recurring task changes the rule and its unfinished tasks.
  const changeReminder = (task: Task, reminderTime: string | null, scope: 'one' | 'all') =>
    run(async () => {
      if (scope === 'all' && task.recurringRuleId) {
        await dataSource.updateRecurringRule(task.recurringRuleId, { reminderTime }, { applyToOpenTasks: true })
        await refreshRules()
      } else await dataSource.updateTask(task.id, { reminderTime })
    })
  const saveNote = (taskId: string, note: string) => run(() => dataSource.updateTask(taskId, { note }))
  const changeTitle = (taskId: string, title: string) => run(() => dataSource.updateTask(taskId, { title }))
  const removeTask = (taskId: string) =>
    run(async () => {
      await dataSource.deleteTask(taskId)
      if (selectedTaskId === taskId) setSelectedTaskId(null)
      if (noteTaskId === taskId) setNoteTaskId(null)
      if (dateTaskId === taskId) setDateTaskId(null)
    })
  const move = (taskId: string, target: BoardGroupAddTarget, beforeId: string | null) => {
    const task = allTasks.find((t) => t.id === taskId)
    // Reordering inside the rondel container keeps the week/month it was rondeled
    // for; only tasks dragged in from a day take the container's period.
    const keepsPeriod = target.rondeled && task?.rondeled && task.dayDate
    const placed = keepsPeriod ? { ...target, dayDate: task.dayDate ?? undefined } : target
    return run(() => dataSource.moveTask(taskId, placed, { beforeId }))
  }

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
      title: dayTitle(iso),
      eyebrow: formatShort(iso),
      highlight: isToday(iso),
      defaultCollapsed: view !== 'day' && todayInRange && iso > today,
      addTarget: { dayDate: iso },
      tasks: dayTasks,
      emptyLabel: 'Nothing here yet — add your first task below',
      // In Day view the top bar prints the day.
      onPrint: view === 'day' ? undefined : () => setPrintRequest({ dayIso: iso, at: Date.now() }),
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
    emptyLabel: 'Nothing rondeled here',
  })

  const bucketGroup = (bucket: keyof Buckets, title: string, eyebrow: string): BoardGroup => ({
    key: bucket,
    kind: 'bucket',
    title,
    eyebrow,
    addTarget: { bucket },
    tasks: buckets[bucket].filter(visible),
    emptyLabel: 'Nothing in bucket list yet',
    // The page header already says "Bucket List / Someday".
    collapsible: false,
    hideTitle: true,
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
        return [containerGroup(), { ...dayGroup(anchorDate), collapsible: false, hideTitle: true }]
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

  const filterSummary = (): string | null => {
    const parts: string[] = []
    if (activeTagIds.length) {
      const names = activeTagIds.map((id) => `#${tagsById.get(id)?.name ?? '?'}`)
      parts.push(`Tags: ${names.join(tagMatchMode === 'all' ? ' and ' : ' or ')}`)
    }
    if (activeStatuses.length) parts.push(`Status: ${activeStatuses.map((s) => STATUS_LABEL[s]).join(', ')}`)
    return parts.length ? parts.join(' · ') : null
  }

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
    // The subtitle already names the weekday, so the page title stays short.
    view === 'day' ? (relativeDayLabel(anchorDate) ?? weekdayName(fromIso(anchorDate).getDay())) : VIEW_TITLE[view]
  const subtitle =
    view === 'day'
      ? formatDayLabel(anchorDate)
      : view === 'week'
        ? `${formatShort(anchorWeekStart)} – ${formatShort(anchorWeekEnd)}`
        : view === 'month'
          ? formatMonthLabel(anchorDate)
          : 'Someday'

  const printTitle = view === 'week' ? `Week of ${subtitle}` : view === 'rondel' ? 'Bucket List' : subtitle

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
          sync={sync}
          reportError={reportError}
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
    <div className={`app ${sidebarOpen ? 'is-sidebar-open' : ''}`.trim()}>
      <div className="app-drawer-backdrop" onClick={() => setSidebarOpen(false)} />
      <Sidebar
        activeView={view}
        onSelectView={(v) => {
          setView(v)
          setPage('board')
          setSidebarOpen(false)
        }}
        tags={tags}
        activeTagIds={activeTagIds}
        onToggleTag={toggleTagFilter}
        onResetTags={resetTagFilter}
        tagMatchMode={tagMatchMode}
        onSetTagMatchMode={setTagMatch}
        activeStatuses={activeStatuses}
        onToggleStatus={toggleStatus}
        onResetStatuses={resetStatuses}
        onOpenSettings={() => {
          setPage('settings')
          setSidebarOpen(false)
        }}
        onOpenRecurring={() => {
          setPage('recurring')
          setSidebarOpen(false)
        }}
      />

      <main className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="app-menu-btn"
            aria-label="Show sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
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
            <IconButton
              icon="print"
              label={view === 'rondel' ? 'Print the Bucket List' : `Print this ${view}`}
              title={`Print ${printTitle}${view === 'week' || view === 'month' ? ', every day with tasks' : ''}`}
              onClick={() => setPrintRequest({ dayIso: null, at: Date.now() })}
            />
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
            onToggleFlag={toggleFlag}
            onDelete={(task) => removeTask(task.id)}
            onQuickAdd={quickAdd}
            onCreateTag={createTagNamed}
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
          onToggleFlag={() => toggleFlag(selectedTask)}
          onChangeReminder={(time, scope) => changeReminder(selectedTask, time, scope)}
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
        open={nagOpen && nagCount > 0}
        waiting={undecided}
        leftUndone={leftUndone}
        weekStartDay={weekStartDay}
        onClose={() => setNagOpen(false)}
        onRondel={(task, target) => rondel(task, target)}
        // A forgotten task counts as done on the day it was planned.
        onSetDone={(task) => setDone(task, { onItsDay: !task.rondeled })}
        onPickDate={(task) => setDateTaskId(task.id)}
      />

      {/* After the nag so "Pick a date" from the nag opens on top of it. */}
      {printRequest && (
        <PrintSheet
          // Exactly what the board shows, filters applied.
          title={printRequest.dayIso ? formatDayLabel(printRequest.dayIso) : printTitle}
          {...(printRequest.dayIso
            ? printView([dayGroup(printRequest.dayIso)], false)
            : // Rondeled items waiting in the period's container aren't printed.
              printView(groups.filter((g) => g.key !== 'rondel-container'), view === 'week' || view === 'month'))}
          tagsById={tagsById}
          filterSummary={filterSummary()}
        />
      )}

      <DatePickModal key={dateTaskId ?? 'closed'} open={Boolean(dateTaskId)} onClose={() => setDateTaskId(null)} onConfirm={confirmDate} />
    </div>
  )
}

export default App
