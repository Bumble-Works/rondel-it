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
import type { Task, TaskStatus } from './domain/types'
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
import { containerDropDay } from './domain/rondel'
import { describeRecurrence } from './domain/recurrence'
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
import { useAppData } from './features/app/useAppData'
import { useMetadataActions } from './features/app/useMetadataActions'
import { useBoardData } from './features/board/useBoardData'
import { useTaskActions } from './features/task/useTaskActions'

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

const BUCKET_DEFS: Array<[keyof Buckets, string, string]> = [['bucket-list', 'Bucket List', 'Someday']]

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function sameWeek(a: string, b: string, weekStartDay: number): boolean {
  return startOfWeek(a, weekStartDay) === startOfWeek(b, weekStartDay)
}

function App() {
  const [nagOpen, setNagOpen] = useState(false)

  const [view, setView] = useState<ViewKey>('day')
  const [anchorDate, setAnchorDate] = useState(todayIso())
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [tagMatchMode, setTagMatchMode] = useState<'any' | 'all'>('any')
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [page, setPage] = useState<'board' | 'settings' | 'recurring' | 'reports'>('board')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [printRequest, setPrintRequest] = useState<{ dayIso: string | null; at: number } | null>(null)

  const [noteTaskId, setNoteTaskId] = useState<string | null>(null)
  const [dateTaskId, setDateTaskId] = useState<string | null>(null)
  const [datePurpose, setDatePurpose] = useState<'rondel' | 'copy'>('rondel')
  const [error, setError] = useState<string | null>(null)

  const reportError = useCallback((context: string, e: unknown) => {
    console.error(`[rondel] ${context}`, e)
    setError(`${context}: ${errorMessage(e)}`)
  }, [])
  const appData = useAppData(reportError)
  const { tags, settings, rules, refresh } = appData

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
  const board = useBoardData({ rangeStart, rangeEnd, containerStart, containerEnd, today }, appData.preparation, reportError)
  const { rangeTasks, bucketTasks, containerItems, undecided, reminderTasks, leftUndone } = board
  const buckets: Buckets = useMemo(() => ({ 'bucket-list': bucketTasks }), [bucketTasks])
  const pendingReviewRef = useRef<'start' | 'end' | null>(null)
  const openReview = useCallback((slot: 'start' | 'end', count: number) => {
    setNagOpen(true)
    announceReview(slot, count).catch((e) => reportError('Couldn’t bring the review to the front', e))
  }, [reportError])

  const sync = useSync({
    onRemoteChange: useCallback(() => { void refresh({ metadata: true, recurring: true }) }, [refresh]),
    reportError,
  })
  const mutationServices = { refresh, reportError, scheduleSync: sync.scheduleSync }
  const taskActions = useTaskActions(mutationServices)
  const metadataActions = useMetadataActions(mutationServices)

  useEffect(() => {
    restoreMenuBarIcon().catch((e) => reportError('Couldn’t show the menu-bar icon', e))
  }, [reportError])

  useScrollToToday((view === 'week' || view === 'month') && todayInRange, `${view}:${rangeStart}`)

  useEffect(() => {
    if (!printRequest) return
    const frame = requestAnimationFrame(() => {
      printPage().catch((e) => reportError('Couldn’t open the print dialog', e))
    })
    return () => cancelAnimationFrame(frame)
  }, [printRequest, reportError])

  const nagCount = undecided.length + leftUndone.length
  useEffect(() => {
    if (!board.ready) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    if (nagCount === 0) setNagOpen(false)
    if (pendingReviewRef.current && board.today === todayIso()) {
      const slot = pendingReviewRef.current
      pendingReviewRef.current = null
      if (nagCount > 0) openReview(slot, nagCount)
    }
  }, [board.ready, board.today, board.updatedAt, nagCount, openReview])

  const allTasks = useMemo(
    () => [...rangeTasks, ...containerItems, ...buckets['bucket-list'], ...undecided, ...leftUndone],
    [rangeTasks, containerItems, buckets, undecided, leftUndone],
  )
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null
  const noteTask = allTasks.find((t) => t.id === noteTaskId) ?? null

  const quickAdd = (target: BoardGroupAddTarget, title: string, tagIds: string[], time: string | null) =>
    taskActions.createTask(toQuickAddCreateTaskInput(target, title, tagIds, activeTagIds, time))

  const onQuickAdded = (id: string, nav: QuickAddNav) => {
    setPage('board')
    setSelectedTaskId(id)
    setView(nav.view)
    setAnchorDate(nav.anchorDate)
  }
  const openReportTask = (task: Task) => {
    setSelectedTaskId(task.id)
    setView('day')
    setAnchorDate(task.dayDate ?? today)
    setPage('board')
  }
  const { advance, setDone, rondel, toggleFlag, changeReminder, addTag, toggleTag, createTagForTask, copyTask } = taskActions
  const { createTag, updateTag, createRule, updateRule, deleteRule, updateSettings } = metadataActions
  const createTagNamed = async (name: string) => (await createTag(name)) ?? null
  const saveNote = (id: string, note: string) => taskActions.update(id, { note })
  const changeTitle = (id: string, title: string) => taskActions.update(id, { title })
  const cancelTask = async (id: string) => {
    if (!await taskActions.cancel(id)) return
    setSelectedTaskId((current) => current === id ? null : current)
    setNoteTaskId((current) => current === id ? null : current)
    setDateTaskId((current) => current === id ? null : current)
  }
  const move = (id: string, target: BoardGroupAddTarget, beforeId: string | null) => {
    const task = allTasks.find((item) => item.id === id)
    if (task) return taskActions.move(task, target, beforeId)
  }
  const deleteTag = async (id: string) => {
    const result = await metadataActions.deleteTag(id)
    if (result !== null) setActiveTagIds((ids) => ids.filter((value) => value !== id))
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
    else void rondel(task, { toDate: dateIso })
  }

  // Review times, task reminders and midnight fire on time, even while hidden.
  const reminderAlerts = useReminderAlerts({
    reminderTasks,
    weekStartDay,
    onSnooze: (task, reminderTime) => { void taskActions.update(task.id, { reminderTime }) },
    onSetDone: (task) => setDone(task),
    onRondel: rondel,
  })
  useSchedule({
    reminders: reminderTasks,
    settings,
    onReminder: reminderAlerts.add,
    onReview: (slot) => {
      // After overnight sleep the count can be stale until the board reloads for
      // the new day. Queue the review until a fresh snapshot arrives.
      if (!board.ready || board.today !== todayIso()) {
        pendingReviewRef.current = slot
        return
      }
      const count = nagCount
      if (count === 0) return
      openReview(slot, count)
    },
    // The new day's recurring tasks are created when the board reloads.
    onNewDay: () => { void refresh() },
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
    <QuickAdd tags={tags} weekStartDay={weekStartDay} activeTagIds={activeTagIds} onCreateTag={createTagNamed} onCreateTask={taskActions.createTask} onAdded={onQuickAdded} onError={reportError} />
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
          <ReportsPage dataSource={dataSource} tags={tags} preparation={appData.preparation} onBack={() => setPage('board')} onError={reportError} onOpenTask={openReportTask} />
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
                onToggleTag={toggleTag}
                onCreateTaskTag={createTagForTask}
                onChangeReminder={changeReminder}
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
