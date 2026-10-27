import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { QuickAdd, type QuickAddNav } from './features/task/QuickAdd'
import { toQuickAddCreateTaskInput } from './features/task/quickAddInput'
import { TaskDetailPanel } from './features/task/TaskDetailPanel'
import { Icon } from './shared/ui/Icon'
import { STATUS_LABEL, toggleStatusFilter } from './shared/taskStatus'
import { ActiveFilters } from './features/board/ActiveFilters'
import { IconButton } from './shared/ui/IconButton'
import { containerDropDay, isWaitingForDecision, showsInRondelContainer } from './domain/rondel'
import { describeRecurrence } from './domain/recurrence'
import type { RecurringRuleInput, RondelTarget } from './services/adapters/DataSource'
import { localDataSource as dataSource } from './services/adapters/localDataSource'
import { useSync } from './features/sync/useSync'
import { restoreMenuBarIcon } from './shared/startAtLogin'
import { PrintSheet } from './features/print/PrintSheet'
import { printView } from './features/print/printView'
import { printPage } from './features/print/printPage'
import { useSchedule } from './features/reminders/useSchedule'
import { useReminderAlerts } from './features/reminders/useReminderAlerts'
import { ReminderModal } from './features/reminders/ReminderModal'
import { announceReview } from './features/reminders/announceReview'
import { features } from './shared/features'

const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })))

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
  const [reminderTasks, setReminderTasks] = useState<Task[]>([])
  const [leftUndone, setLeftUndone] = useState<Task[]>([])
  const [nagOpen, setNagOpen] = useState(false)

  const [view, setView] = useState<ViewKey>('day')
  const [anchorDate, setAnchorDate] = useState(todayIso())
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [tagMatchMode, setTagMatchMode] = useState<'any' | 'all'>('any')
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [page, setPage] = useState<'board' | 'settings' | 'recurring' | 'reports'>('board')
  const [reportsRevision, setReportsRevision] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [printRequest, setPrintRequest] = useState<{ dayIso: string | null; at: number } | null>(null)

  const [noteTaskId, setNoteTaskId] = useState<string | null>(null)
  const [dateTaskId, setDateTaskId] = useState<string | null>(null)
  const [datePurpose, setDatePurpose] = useState<'rondel' | 'copy'>('rondel')
  const [boardReload, setBoardReload] = useState(0)
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

  const containerStart = view === 'month' ? monthStart : anchorWeekStart
  const containerEnd = view === 'month' ? monthEnd : anchorWeekEnd

  const rangeStart = view === 'day' ? anchorDate : view === 'week' ? anchorWeekStart : monthStart
  const rangeEnd = view === 'day' ? anchorDate : view === 'week' ? anchorWeekEnd : monthEnd
  const todayInRange = today >= rangeStart && today <= rangeEnd

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const repeatLabels = useMemo(() => new Map(rules.map((r) => [r.id, describeRecurrence(r)])), [rules])
  const recurringSyncedFor = useRef<string | null>(null)

  const reportError = useCallback((context: string, e: unknown) => {
    console.error(`[rondel] ${context}`, e)
    setError(`${context}: ${errorMessage(e)}`)
  }, [])

  const loadedDayRef = useRef<string | null>(null)
  const pendingReviewRef = useRef<'start' | 'end' | null>(null)

  const openReview = useCallback(
    (slot: 'start' | 'end', count: number) => {
      setNagOpen(true)
      announceReview(slot, count).catch((e) => reportError('Couldn’t bring the review to the front', e))
    },
    [reportError],
  )

  const loadBoard = useCallback(async () => {
    try {
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
      setReportsRevision((revision) => revision + 1)
      setBuckets({ 'bucket-list': bl })

      setContainerItems(rondelItems.filter((t) => showsInRondelContainer(t, { start: containerStart, end: containerEnd }, today)))

      const undecidedItems = rondelItems.filter((t) => isWaitingForDecision(t, today))
      setUndecided(undecidedItems)
      setLeftUndone(leftItems)

      const nagTotal = undecidedItems.length + leftItems.length
      if (nagTotal === 0) setNagOpen(false)

      loadedDayRef.current = today
      // Open a queued review only once the board is on the real current day.
      if (pendingReviewRef.current && today === todayIso()) {
        const slot = pendingReviewRef.current
        pendingReviewRef.current = null
        if (nagTotal > 0) openReview(slot, nagTotal)
      }

      setError(null)
    } catch (e) {
      reportError('Unable to load tasks', e)
    }
  }, [reportError, openReview, rangeStart, rangeEnd, containerStart, containerEnd, today])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAppData()
  }, [loadAppData])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings) void loadBoard()
  }, [settings, loadBoard, boardReload])

  useScrollToToday((view === 'week' || view === 'month') && todayInRange, `${view}:${rangeStart}`)

  useEffect(() => {
    if (!printRequest) return
    const frame = requestAnimationFrame(() => {
      printPage().catch((e) => reportError('Couldn’t open the print dialog', e))
    })
    return () => cancelAnimationFrame(frame)
  }, [printRequest, reportError])

  const nagCount = undecided.length + leftUndone.length
  const nagCountRef = useRef(0)
  useEffect(() => {
    nagCountRef.current = nagCount
  }, [nagCount])

  const allTasks = useMemo(
    () => [...rangeTasks, ...containerItems, ...buckets['bucket-list'], ...undecided, ...leftUndone],
    [rangeTasks, containerItems, buckets, undecided, leftUndone],
  )
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null
  const noteTask = allTasks.find((t) => t.id === noteTaskId) ?? null

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
    run(() => dataSource.createTask(toQuickAddCreateTaskInput(target, title, tagIds, activeTagIds)))

  const onQuickAdded = (id: string, nav: QuickAddNav) => {
    setPage('board')
    setSelectedTaskId(id)
    setView(nav.view)
    setAnchorDate(nav.anchorDate)
    setBoardReload((n) => n + 1)
    scheduleSync()
  }

  const openReportTask = (task: Task) => {
    setSelectedTaskId(task.id)
    setView('day')
    setAnchorDate(task.dayDate ?? today)
    setPage('board')
  }

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
  const cancelTask = (taskId: string) =>
    run(async () => {
      await dataSource.setTaskStatus(taskId, 'canceled')
      if (selectedTaskId === taskId) setSelectedTaskId(null)
      if (noteTaskId === taskId) setNoteTaskId(null)
      if (dateTaskId === taskId) setDateTaskId(null)
    })
  const move = (taskId: string, target: BoardGroupAddTarget, beforeId: string | null) => {
    const task = allTasks.find((t) => t.id === taskId)
    // Reordering in the container keeps its rondeled period; day-drags take the container's.
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
    setActiveStatuses((prev) => toggleStatusFilter(prev, status))
  const resetStatuses = () => setActiveStatuses([])
  // Selecting every tag is still a filter: it hides untagged tasks, which
  // "All tags" shows. (With one tag, that's the only way to filter by it.)
  const toggleTagFilter = (id: string) =>
    setActiveTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const resetTagFilter = () => setActiveTagIds([])

  // Tag changes run one at a time, each on the task's current tags, so quick
  // picks (e.g. two #tags in a row) never undo each other.
  const tagQueue = useRef<Promise<unknown>>(Promise.resolve())
  const changeTags = (taskId: string, change: (tagIds: string[]) => string[]) => {
    const job = tagQueue.current.then(async () => {
      const { tagIds } = await dataSource.getTask(taskId)
      await dataSource.updateTask(taskId, { tagIds: change(tagIds) })
    })
    tagQueue.current = job.catch(() => {})
    return job
  }
  const addTag = (task: Task, tagId: string) =>
    run(() => changeTags(task.id, (ids) => (ids.includes(tagId) ? ids : [...ids, tagId])))
  const toggleTag = (task: Task, tagId: string) =>
    run(() => changeTags(task.id, (ids) => (ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId])))

  const createTagForTask = (task: Task, name: string) =>
    void attempt('Unable to create tag', async () => {
      const tag = await dataSource.createTag({ name })
      await changeTags(task.id, (ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
      await refreshTags()
      await loadBoard()
    })

  // A fresh to-do on that day: new — not recurring, never rondeled, no history or reminder.
  const copyTask = (task: Task, dayIso: string) =>
    run(async () => {
      const copy = await dataSource.createTask({ title: task.title, dayDate: dayIso, tagIds: task.tagIds })
      if (task.note || task.flagged) await dataSource.updateTask(copy.id, { note: task.note, flagged: task.flagged })
    })

  const openReminder = (task: Task) => {
    setSelectedTaskId(task.id)
    requestAnimationFrame(() => document.getElementById('reminder-time')?.focus())
  }

  const pickDate = (task: Task, purpose: 'rondel' | 'copy') => {
    setDatePurpose(purpose)
    setDateTaskId(task.id)
  }
  const confirmDate = (dateIso: string) => {
    const task = allTasks.find((t) => t.id === dateTaskId)
    setDateTaskId(null)
    if (!task) return
    if (datePurpose === 'copy') copyTask(task, dateIso)
    else void run(() => dataSource.moveTask(task.id, { dayDate: dateIso }, { rondel: true }))
  }

  // Review times, task reminders and midnight fire on time, even while hidden.
  const reminderAlerts = useReminderAlerts({
    reminderTasks,
    weekStartDay,
    onSnooze: (task, reminderTime) => run(() => dataSource.updateTask(task.id, { reminderTime })),
    onSetDone: (task) => setDone(task),
    onRondel: rondel,
  })
  useSchedule({
    reminders: reminderTasks,
    settings,
    onReminder: reminderAlerts.add,
    onReview: (slot) => {
      // After overnight sleep the count can be stale until the board reloads for
      // the new day. Queue the review; loadBoard opens it when that data lands.
      if (loadedDayRef.current !== todayIso()) {
        pendingReviewRef.current = slot
        return
      }
      const count = nagCountRef.current
      if (count === 0) return
      openReview(slot, count)
    },
    // The new day's recurring tasks are created when the board reloads.
    onNewDay: () => void loadBoard(),
  })

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

  const refreshRules = async () => setRules(await dataSource.listRecurringRules())
  const createRule = (input: RecurringRuleInput) =>
    void attempt('Unable to create recurring task', async () => {
      await dataSource.createRecurringRule(input)
      await refreshRules()
      await loadBoard()
    })
  const updateRule = (id: string, input: RecurringRuleInput) =>
    void attempt('Unable to update recurring task', async () => {
      // The task already on the list follows the edit too.
      await dataSource.updateRecurringRule(id, input, { applyToOpenTasks: true })
      await refreshRules()
      await loadBoard()
    })
  const deleteRule = (id: string) =>
    void attempt('Unable to delete recurring task', async () => {
      await dataSource.deleteRecurringRule(id)
      await refreshRules()
    })

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
    addTarget: { dayDate: containerDropDay({ start: containerStart, end: containerEnd }, today), rondeled: true },
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

  const quickAddEl = (
    <QuickAdd tags={tags} weekStartDay={weekStartDay} activeTagIds={activeTagIds} onCreateTag={createTagNamed} onAdded={onQuickAdded} onError={reportError} />
  )

  if (page === 'settings' && settings) {
    return (
      <div className="app">
        {error && <p className="app-error">{error}</p>}
        <div className="app-float-add">{quickAddEl}</div>
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
        <div className="app-float-add">{quickAddEl}</div>
        <RecurringPage
          rules={rules}
          tags={tags}
          onCreate={createRule}
          onUpdate={updateRule}
          onDelete={deleteRule}
          onCreateTag={createTagNamed}
          onBack={() => setPage('board')}
        />
      </div>
    )
  }

  return (
    <div className={`app ${sidebarOpen ? 'is-sidebar-open' : ''}`.trim()}>
      {page === 'reports' && features.reports ? (
        <Suspense fallback={<main className="app-main"><p role="status">Loading reports…</p></main>}>
          <ReportsPage dataSource={dataSource} tags={tags} revision={reportsRevision} onBack={() => setPage('board')} onError={reportError} onOpenTask={openReportTask} />
        </Suspense>
      ) : (
        <>
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
            onSetTagMatchMode={setTagMatchMode}
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
            onOpenReports={() => {
              setSelectedTaskId(null)
              setPrintRequest(null)
              setPage('reports')
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
                <ActiveFilters
                  activeTagIds={activeTagIds}
                  activeStatuses={activeStatuses}
                  tagsById={tagsById}
                  resetTagFilter={resetTagFilter}
                  resetStatuses={resetStatuses}
                  toggleStatus={toggleStatus}
                  toggleTagFilter={toggleTagFilter}
                />
                {quickAddEl}
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
                repeatLabels={repeatLabels}
                selectedTaskId={selectedTaskId}
                onOpen={(task) => setSelectedTaskId(task.id)}
                onAdvance={advance}
                onSetDone={setDone}
                onRondel={rondel}
                onPickDate={(task) => pickDate(task, 'rondel')}
                onOpenNote={(task) => setNoteTaskId(task.id)}
                onToggleFlag={toggleFlag}
                onCancel={(task) => cancelTask(task.id)}
                onCopy={copyTask}
                onPickCopyDate={(task) => pickDate(task, 'copy')}
                onOpenReminder={openReminder}
                onQuickAdd={quickAdd}
                onCreateTag={createTagNamed}
                onMove={move}
                weekStartDay={weekStartDay}
              />
            </div>
          </main>
        </>
      )}

      {selectedTask && page === 'board' && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          allTags={tags}
          repeatLabel={selectedTask.recurringRuleId ? (repeatLabels.get(selectedTask.recurringRuleId) ?? null) : undefined}
          onClose={() => setSelectedTaskId(null)}
          onChangeTitle={(title) => changeTitle(selectedTask.id, title)}
          onToggleTag={(tagId) => toggleTag(selectedTask, tagId)}
          onAddTag={(tagId) => addTag(selectedTask, tagId)}
          onSaveNote={(note) => saveNote(selectedTask.id, note)}
          onToggleFlag={() => toggleFlag(selectedTask)}
          onChangeReminder={(time, scope) => changeReminder(selectedTask, time, scope)}
          onAdvance={() => advance(selectedTask)}
          onSetDone={() => setDone(selectedTask)}
          onRondel={(target) => rondel(selectedTask, target)}
          onPickDate={() => pickDate(selectedTask, 'rondel')}
          onCancel={() => cancelTask(selectedTask.id)}
          onCreateTag={(name) => createTagForTask(selectedTask, name)}
          createTag={createTagNamed}
          weekStartDay={weekStartDay}
        />
      )}

      <NoteModal
        key={`note:${noteTaskId ?? 'closed'}`}
        open={Boolean(noteTask)}
        task={noteTask}
        onClose={() => setNoteTaskId(null)}
        onSave={(note) => noteTask && saveNote(noteTask.id, note)}
      />

      <ReminderModal {...reminderAlerts.modal} weekStartDay={weekStartDay} />
      <NagModal
        open={nagOpen && nagCount > 0}
        waiting={undecided}
        leftUndone={leftUndone}
        weekStartDay={weekStartDay}
        onClose={() => setNagOpen(false)}
        onRondel={(task, target) => rondel(task, target)}
        // A forgotten task counts as done on the day it was planned.
        onSetDone={(task) => setDone(task, { onItsDay: !task.rondeled })}
        onCancel={(task) => cancelTask(task.id)}
        onPickDate={(task) => pickDate(task, 'rondel')}
      />

      {/* After the nag so "Pick a date" from the nag opens on top of it. */}
      {printRequest && (
        <PrintSheet
          key={printRequest.at}
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

      <DatePickModal
        key={`date:${dateTaskId ?? 'closed'}`}
        open={Boolean(dateTaskId)}
        purpose={datePurpose}
        onClose={() => setDateTaskId(null)}
        onConfirm={confirmDate}
      />
    </div>
  )
}

export default App
