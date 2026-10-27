import { localDataSource } from './localDataSource'

describe('localDataSource tasks', () => {
  it('creates a dated task with a reminder and ignores reminders on undated placements', async () => {
    const task = await localDataSource.createTask({ title: 'Call', dayDate: '2026-10-28', reminderTime: '10:00' })
    expect((await localDataSource.getTask(task.id)).reminderTime).toBe('10:00')
    for (const target of [{ bucket: 'bucket-list' as const }, { dayDate: '2026-10-28', rondeled: true }]) {
      expect(await localDataSource.createTask({ title: 'Plan', ...target, reminderTime: '10:00' })).toMatchObject({ reminderTime: null })
    }
  })

  it('lists range, bucket, and rondel tasks with tag filters', async () => {
    const a = await localDataSource.createTask({
      title: 'A',
      dayDate: '2026-09-20',
      tagIds: ['x'],
    })
    const b = await localDataSource.createTask({
      title: 'B',
      dayDate: null,
      bucket: 'bucket-list',
      tagIds: ['y'],
    })
    const c = await localDataSource.createTask({
      title: 'C',
      dayDate: '2026-09-21',
      rondeled: true,
    })

    expect((await localDataSource.listTasksInRange('2026-09-01', '2026-09-30')).map((t) => t.id)).toEqual([
      a.id,
      c.id,
    ])
    expect((await localDataSource.listTasksInRange('2026-09-01', '2026-09-30', 'x')).map((t) => t.id)).toEqual([
      a.id,
    ])
    expect((await localDataSource.listBucketTasks('bucket-list')).map((t) => t.id)).toEqual([b.id])
    expect((await localDataSource.listBucketTasks('bucket-list', 'y')).map((t) => t.id)).toEqual([b.id])
    expect((await localDataSource.listRondelItems()).map((t) => t.id)).toEqual([c.id])
  })

  it('creates, updates, advances, and sets status correctly', async () => {
    const task = await localDataSource.createTask({ title: '  Task  ', dayDate: '2026-09-20' })
    expect(task.title).toBe('Task')
    expect(task.status).toBe('todo')

    const updated = await localDataSource.updateTask(task.id, {
      title: 'Task+',
      tagIds: ['a'],
      note: 'n',
    })
    expect(updated.title).toBe('Task+')
    expect(updated.tagIds).toEqual(['a'])
    expect(updated.note).toBe('n')

    expect((await localDataSource.advanceTask(task.id)).status).toBe('doing')
    const done = await localDataSource.advanceTask(task.id)
    expect(done.status).toBe('done')
    expect(done.completedAt).not.toBeNull()
    const reopened = await localDataSource.advanceTask(task.id)
    expect(reopened.status).toBe('todo')
    expect(reopened.completedAt).toBeNull()

    const canceled = await localDataSource.setTaskStatus(task.id, 'canceled')
    expect(canceled.status).toBe('canceled')
    expect(canceled.completedAt).toBeNull()
  })

  it('moves tasks including reorder and rondel carry-forward behavior', async () => {
    const t1 = await localDataSource.createTask({ title: 'One', dayDate: '2026-09-20' })
    const t2 = await localDataSource.createTask({ title: 'Two', dayDate: '2026-09-20' })
    const t3 = await localDataSource.createTask({ title: 'Three', dayDate: '2026-09-20' })

    await localDataSource.moveTask(t3.id, { dayDate: '2026-09-20', rondeled: false }, { beforeId: t1.id })
    const order = await localDataSource.listTasksInRange('2026-09-20', '2026-09-20')
    expect(order.map((t) => t.id)).toEqual([t3.id, t1.id, t2.id])

  })

  it('rondels a not-started task by moving it, keeping its first day', async () => {
    const task = await localDataSource.createTask({ title: 'Todo', dayDate: '2026-09-21' })
    const moved = await localDataSource.moveTask(task.id, { dayDate: '2026-09-22' }, { rondel: true })

    expect(moved.id).toBe(task.id)
    expect(moved.status).toBe('todo')
    expect(moved.rondelCount).toBe(1)
    expect(moved.originDate).toBe('2026-09-21')
    expect(await localDataSource.listTasksInRange('2026-09-21', '2026-09-21')).toHaveLength(0)
  })

  it('rondels a doing task by keeping it on its day and carrying a doing copy forward', async () => {
    const task = await localDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await localDataSource.advanceTask(task.id)
    const copy = await localDataSource.moveTask(task.id, { dayDate: '2026-09-22' }, { rondel: true })

    expect(copy.id).not.toBe(task.id)
    expect(copy.status).toBe('doing')
    expect(copy.rondelCount).toBe(1)
    expect(copy.originDate).toBe('2026-09-21')
    expect(copy.originTaskId).toBe(task.id)
    expect(copy.previousTaskId).toBe(task.id)

    // Changing the copy never touches the history left on Monday.
    await localDataSource.setTaskStatus(copy.id, 'todo')
    const [monday] = await localDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(monday.id).toBe(task.id)
    expect(monday.status).toBe('doing')
    expect(monday.carriedToId).toBe(copy.id)

    // A second hop keeps the lineage pointing at the original.
    await localDataSource.advanceTask(copy.id)
    const next = await localDataSource.moveTask(copy.id, { dayDate: '2026-09-23' }, { rondel: true })
    expect(next.rondelCount).toBe(2)
    expect(next.originTaskId).toBe(task.id)
    expect(next.previousTaskId).toBe(copy.id)
  })

  it('orders a day as active, then carried-forward history, then done', async () => {
    const carried = await localDataSource.createTask({ title: 'Carried', dayDate: '2026-09-21' })
    const done = await localDataSource.createTask({ title: 'Done', dayDate: '2026-09-21' })
    const active = await localDataSource.createTask({ title: 'Active', dayDate: '2026-09-21' })
    await localDataSource.advanceTask(carried.id)
    await localDataSource.moveTask(carried.id, { dayDate: '2026-09-22' }, { rondel: true })
    await localDataSource.setTaskStatus(done.id, 'done')

    const day = await localDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(day.map((t) => t.id)).toEqual([active.id, carried.id, done.id])
  })

  it('turns a rondeled task into a regular task on today when started or finished', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 3, 12)) // Nov 3

    const waiting = await localDataSource.createTask({ title: 'Waiting', dayDate: '2026-10-26' })
    await localDataSource.moveTask(waiting.id, { dayDate: '2026-11-01', rondeled: true }, { rondel: true })
    const started = await localDataSource.advanceTask(waiting.id)
    expect(started).toMatchObject({ status: 'doing', dayDate: '2026-11-03', rondeled: false })
    expect(started).toMatchObject({ rondelCount: 1, originDate: '2026-10-26', createdAt: waiting.createdAt })

    const other = await localDataSource.createTask({ title: 'Other', dayDate: '2026-11-01', rondeled: true })
    const done = await localDataSource.setTaskStatus(other.id, 'done')
    expect(done).toMatchObject({ status: 'done', dayDate: '2026-11-03', rondeled: false })
    expect(done.completedAt).not.toBeNull()
  })

  it('does not count giving a waiting item a day as another rondel', async () => {
    const task = await localDataSource.createTask({ title: 'Waiting', dayDate: '2026-10-26' })
    await localDataSource.moveTask(task.id, { dayDate: '2026-11-01', rondeled: true }, { rondel: true })
    const scheduled = await localDataSource.moveTask(task.id, { dayDate: '2026-11-03' }, { rondel: true })
    expect(scheduled).toMatchObject({ dayDate: '2026-11-03', rondeled: false, rondelCount: 1 })

    const dream = await localDataSource.createTask({ title: 'Dream', bucket: 'bucket-list' })
    const dated = await localDataSource.moveTask(dream.id, { dayDate: '2026-11-03' }, { rondel: true })
    expect(dated).toMatchObject({ dayDate: '2026-11-03', bucket: null, rondelCount: 0 })

    // Out of the Bucket List into next week's container is scheduling too.
    const someday = await localDataSource.createTask({ title: 'Someday', bucket: 'bucket-list' })
    const nextWeek = await localDataSource.moveTask(someday.id, { dayDate: '2026-11-09', rondeled: true }, { rondel: true })
    expect(nextWeek).toMatchObject({ rondeled: true, bucket: null, rondelCount: 0, originDate: '2026-11-09' })

    // Pushing it off again still counts.
    const pushed = await localDataSource.moveTask(task.id, { dayDate: '2026-11-04' }, { rondel: true })
    expect(pushed.rondelCount).toBe(2)
  })

  it('flags a task without reordering it, and carries the flag forward', async () => {
    const first = await localDataSource.createTask({ title: 'First', dayDate: '2026-09-21' })
    const important = await localDataSource.createTask({ title: 'Important', dayDate: '2026-09-21' })
    expect(important.flagged).toBe(false)

    await localDataSource.updateTask(important.id, { flagged: true })
    const day = await localDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(day.map((t) => [t.id, t.flagged])).toEqual([[first.id, false], [important.id, true]])

    await localDataSource.advanceTask(important.id)
    const copy = await localDataSource.moveTask(important.id, { dayDate: '2026-09-22' }, { rondel: true })
    expect(copy.flagged).toBe(true)
  })

  it('moves a reopened task to the top of its day', async () => {
    const first = await localDataSource.createTask({ title: 'First', dayDate: '2026-09-21' })
    const reopened = await localDataSource.createTask({ title: 'Reopened', dayDate: '2026-09-21' })
    await localDataSource.setTaskStatus(reopened.id, 'done')
    await localDataSource.advanceTask(reopened.id) // done → todo

    const day = await localDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(day.map((t) => t.id)).toEqual([reopened.id, first.id])
  })

  it('moves done items left in a rondel container to the day they were completed', async () => {
    const completedAt = new Date(2026, 9, 14, 15).toISOString() // Oct 14, local afternoon
    localStorage.setItem('rondel.v6.tags', '[]')
    localStorage.setItem(
      'rondel.v6.tasks',
      JSON.stringify([
        {
          id: 'stuck', title: 'Stuck', status: 'done', dayDate: '2026-10-12', rondeled: true,
          bucket: null, position: 0, rondelCount: 1, tagIds: [], note: '',
          createdAt: '2026-10-01T09:00:00.000Z', completedAt, recurringRuleId: null,
        },
      ]),
    )
    expect(await localDataSource.listRondelItems()).toHaveLength(0)
    const [task] = await localDataSource.listTasksInRange('2026-10-14', '2026-10-14')
    expect(task).toMatchObject({ id: 'stuck', rondeled: false, dayDate: '2026-10-14', rondelCount: 1 })
  })

  it('restores the history copy when its carried-forward copy is deleted', async () => {
    const monday = await localDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await localDataSource.advanceTask(monday.id)
    const tuesday = await localDataSource.moveTask(monday.id, { dayDate: '2026-09-22' }, { rondel: true })

    await localDataSource.deleteTask(tuesday.id)
    const [restored] = await localDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(restored.carriedToId).toBeNull()
    expect(restored.status).toBe('doing')
  })

  it('keeps the chain linked when a middle history copy is deleted', async () => {
    const monday = await localDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await localDataSource.advanceTask(monday.id)
    const tuesday = await localDataSource.moveTask(monday.id, { dayDate: '2026-09-22' }, { rondel: true })
    const wednesday = await localDataSource.moveTask(tuesday.id, { dayDate: '2026-09-23' }, { rondel: true })

    await localDataSource.deleteTask(tuesday.id)
    const week = await localDataSource.listTasksInRange('2026-09-21', '2026-09-23')
    expect(week.find((t) => t.id === monday.id)?.carriedToId).toBe(wednesday.id)
    expect(week.find((t) => t.id === wednesday.id)?.previousTaskId).toBe(monday.id)
  })

  it('refuses to rondel done tasks and carried-forward history', async () => {
    const done = await localDataSource.createTask({ title: 'Done', dayDate: '2026-09-21' })
    await localDataSource.setTaskStatus(done.id, 'done')
    await expect(
      localDataSource.moveTask(done.id, { dayDate: '2026-09-22' }, { rondel: true }),
    ).rejects.toThrow('can not be rondeled')

    const doing = await localDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await localDataSource.advanceTask(doing.id)
    await localDataSource.moveTask(doing.id, { dayDate: '2026-09-22' }, { rondel: true })
    await expect(
      localDataSource.moveTask(doing.id, { dayDate: '2026-09-23' }, { rondel: true }),
    ).rejects.toThrow('can not be rondeled')
  })

  it('reads tasks saved before lineage fields existed', async () => {
    localStorage.setItem('rondel.v6.tags', '[]')
    localStorage.setItem(
      'rondel.v6.tasks',
      JSON.stringify([
        {
          id: 'old',
          title: 'Old',
          status: 'doing',
          dayDate: '2026-09-01',
          rondeled: false,
          bucket: null,
          position: 0,
          rondelCount: 2,
          tagIds: [],
          note: 'kept',
          createdAt: '2026-09-01T09:00:00.000Z',
          completedAt: null,
          recurringRuleId: null,
        },
      ]),
    )
    const [task] = await localDataSource.listTasksInRange('2026-09-01', '2026-09-01')
    expect(task).toMatchObject({
      flagged: false,
      note: 'kept',
      rondelCount: 2,
      originDate: '2026-09-01',
      originTaskId: null,
      previousTaskId: null,
      carriedToId: null,
    })
    const copy = await localDataSource.moveTask('old', { dayDate: '2026-09-02' }, { rondel: true })
    expect(copy.rondelCount).toBe(3)
  })

  it('throws for missing tasks', async () => {
    await expect(localDataSource.updateTask('missing', { title: 'x' })).rejects.toThrow('Task not found')
    await expect(localDataSource.deleteTask('missing')).rejects.toThrow('Task not found')
  })
})

describe('localDataSource tags/settings', () => {
  it('creates, updates, deletes tags and unlinks deleted tags from tasks', async () => {
    const tag = await localDataSource.createTag({ name: '  Work  ' })
    expect(tag.name).toBe('Work')
    expect(tag.color).toBe('#3b82f6')
    const updated = await localDataSource.updateTag(tag.id, { color: '#111111' })
    expect(updated.color).toBe('#111111')

    const task = await localDataSource.createTask({
      title: 'Tagged',
      dayDate: '2026-09-20',
      tagIds: [tag.id],
    })
    await localDataSource.deleteTag(tag.id)
    const after = await localDataSource.listTasksInRange('2026-09-01', '2026-09-30')
    expect(after.find((t) => t.id === task.id)?.tagIds).toEqual([])
    await expect(localDataSource.updateTag('missing', { name: 'x' })).rejects.toThrow('Tag not found')
  })

  it('reads and updates settings', async () => {
    const defaults = await localDataSource.getSettings()
    expect(defaults.weekStartDay).toBe(1)
    expect(defaults.dayStartTime).toBe('09:00')
    const updated = await localDataSource.updateSettings({ weekStartDay: 0, endOfDayTime: '18:00' })
    expect(updated.weekStartDay).toBe(0)
    expect(updated.endOfDayTime).toBe('18:00')
    expect((await localDataSource.getSettings()).weekStartDay).toBe(0)
  })
})

describe('localDataSource recurring', () => {
  it('creates, lists, updates, and deletes recurring rules', async () => {
    const rule = await localDataSource.createRecurringRule({
      title: '  Weekly  ',
      kind: 'weekly-on',
      weekday: 2,
    })
    expect(rule.title).toBe('Weekly')
    expect((await localDataSource.listRecurringRules())).toHaveLength(1)
    const updated = await localDataSource.updateRecurringRule(rule.id, {
      kind: 'monthly-on',
      dayOfMonth: 15,
      note: 'x',
    })
    expect(updated.kind).toBe('monthly-on')
    expect(updated.dayOfMonth).toBe(15)
    expect(updated.note).toBe('x')
    await localDataSource.deleteRecurringRule(rule.id)
    expect(await localDataSource.listRecurringRules()).toHaveLength(0)
    await expect(localDataSource.updateRecurringRule('missing', { title: 'x' })).rejects.toThrow(
      'Recurring rule not found',
    )
  })

  it('syncs recurring tasks and prevents duplicate pending start-rule items', async () => {
    // Rules start from their creation date, so pin the clock to keep the
    // expected occurrences inside the ranges below.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 15, 12))
    const startRule = await localDataSource.createRecurringRule({
      title: 'Start weekly',
      kind: 'weekly-start',
    })
    const monthlyOn = await localDataSource.createRecurringRule({
      title: 'Billing',
      kind: 'monthly-on',
      dayOfMonth: 1,
    })

    await localDataSource.syncRecurring('2026-10-31')
    await localDataSource.syncRecurring('2026-10-31')

    const rondelItems = await localDataSource.listRondelItems()
    const startPending = rondelItems.filter((t) => t.recurringRuleId === startRule.id && t.status !== 'done')
    expect(startPending).toHaveLength(1)

    const rangeTasks = await localDataSource.listTasksInRange('2026-09-01', '2026-10-31')
    expect(rangeTasks.some((t) => t.recurringRuleId === monthlyOn.id)).toBe(true)

    await localDataSource.setTaskStatus(startPending[0].id, 'done')
    await localDataSource.syncRecurring('2026-11-30')
    // The finished one became a regular done task on today; the next one waits in its container.
    const afterDone = await localDataSource.listRondelItems()
    const waitingForRule = afterDone.filter((t) => t.recurringRuleId === startRule.id)
    expect(waitingForRule).toHaveLength(1)
    expect(waitingForRule[0].status).toBe('todo')
    const [finished] = await localDataSource.listTasksInRange('2026-09-15', '2026-09-15')
    expect(finished).toMatchObject({ id: startPending[0].id, status: 'done', rondeled: false })
    vi.useRealTimers()
  })

  it('gives the same recurring occurrence the same id on every device', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 14, 9)) // Mon Sep 14
    const rule = await localDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1 })
    await localDataSource.syncRecurring('2026-09-14')
    const [task] = await localDataSource.listTasksInRange('2026-09-14', '2026-09-14')
    expect(task.id).toBe(`rec:${rule.id}:2026-09-14`)
  })

  it('keeps reminder times on tasks and lists upcoming ones', async () => {
    const call = await localDataSource.createTask({ title: 'Call dentist', dayDate: '2026-10-20' })
    expect(call.reminderTime).toBeNull()
    await localDataSource.updateTask(call.id, { reminderTime: '09:30' })
    const past = await localDataSource.createTask({ title: 'Yesterday', dayDate: '2026-10-18' })
    await localDataSource.updateTask(past.id, { reminderTime: '08:00' })
    const finished = await localDataSource.createTask({ title: 'Done one', dayDate: '2026-10-20' })
    await localDataSource.updateTask(finished.id, { reminderTime: '10:00' })
    await localDataSource.setTaskStatus(finished.id, 'done')

    const upcoming = await localDataSource.listUpcomingReminders('2026-10-19')
    expect(upcoming.map((t) => [t.title, t.reminderTime])).toEqual([['Call dentist', '09:30']])

    await localDataSource.updateTask(call.id, { reminderTime: null })
    expect(await localDataSource.listUpcomingReminders('2026-10-19')).toEqual([])
  })

  it('copies a rule’s reminder to its tasks, and can update the rule plus its open tasks', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 14, 7)) // Mon Sep 14
    const rule = await localDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1, reminderTime: '09:00' })
    await localDataSource.syncRecurring('2026-09-14')
    const [today] = await localDataSource.listTasksInRange('2026-09-14', '2026-09-14')
    expect(today.reminderTime).toBe('09:00')

    // "All": the rule and its unfinished tasks get the new time.
    await localDataSource.updateRecurringRule(rule.id, { reminderTime: '09:15' }, { applyToOpenTasks: true })
    expect((await localDataSource.listRecurringRules())[0].reminderTime).toBe('09:15')
    const [updated] = await localDataSource.listTasksInRange('2026-09-14', '2026-09-14')
    expect(updated.reminderTime).toBe('09:15')
  })

  it('lists tasks left undone on past days, oldest first, and can mark them done on their day', async () => {
    const monday = await localDataSource.createTask({ title: 'Forgot to check off', dayDate: '2026-10-12' })
    const tuesday = await localDataSource.createTask({ title: 'Still doing', dayDate: '2026-10-13' })
    await localDataSource.advanceTask(tuesday.id)
    await localDataSource.createTask({ title: 'Today', dayDate: '2026-10-19' })
    const finished = await localDataSource.createTask({ title: 'Finished', dayDate: '2026-10-12' })
    await localDataSource.setTaskStatus(finished.id, 'done')

    const left = await localDataSource.listLeftUndone('2026-10-19')
    expect(left.map((t) => t.title)).toEqual(['Forgot to check off', 'Still doing'])

    const done = await localDataSource.setTaskStatus(monday.id, 'done', { onItsDay: true })
    expect(done.dayDate).toBe('2026-10-12')
    expect(new Date(done.completedAt!).getDate()).toBe(12) // completed that day, local time
    expect((await localDataSource.listLeftUndone('2026-10-19')).map((t) => t.title)).toEqual(['Still doing'])
  })

  it('creates the next repeat only once the previous one is done, skipping missed ones', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await localDataSource.createRecurringRule({
      title: 'Gym',
      kind: 'repeat',
      repeat: { unit: 'week', every: 1, weekdays: [1, 3, 5], startDate: '2026-10-19', endDate: null },
    })
    const gymDays = async () =>
      (await localDataSource.listTasksInRange('2026-10-19', '2026-11-01'))
        .filter((t) => t.recurringRuleId === rule.id)
        .map((t) => t.dayDate)
        .sort()

    await localDataSource.syncRecurring('2026-10-19')
    expect(await gymDays()).toEqual(['2026-10-19'])

    // Monday's is still open (doing counts), so Wednesday's isn't created.
    const [monday] = await localDataSource.listTasksInRange('2026-10-19', '2026-10-19')
    await localDataSource.setTaskStatus(monday.id, 'doing')
    await localDataSource.syncRecurring('2026-10-21')
    expect(await gymDays()).toEqual(['2026-10-19'])

    // Finished on Thursday: Wednesday's is skipped; the next one is Friday's.
    await localDataSource.setTaskStatus(monday.id, 'done')
    await localDataSource.syncRecurring('2026-10-22')
    expect(await gymDays()).toEqual(['2026-10-19'])
    await localDataSource.syncRecurring('2026-10-23')
    expect(await gymDays()).toEqual(['2026-10-19', '2026-10-23'])
  })

  it('skips a day that came due while the previous one was open', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await localDataSource.createRecurringRule({
      title: 'Stretch',
      kind: 'repeat',
      repeat: { unit: 'day', every: 1, startDate: '2026-10-19', endDate: null },
    })
    await localDataSource.syncRecurring('2026-10-19')
    await localDataSource.syncRecurring('2026-10-20') // Monday's still open: Tuesday's is skipped
    const [monday] = await localDataSource.listTasksInRange('2026-10-19', '2026-10-19')
    await localDataSource.setTaskStatus(monday.id, 'done')
    await localDataSource.syncRecurring('2026-10-20')
    await localDataSource.syncRecurring('2026-10-21')
    const days = (await localDataSource.listTasksInRange('2026-10-19', '2026-10-25'))
      .filter((t) => t.recurringRuleId === rule.id)
      .map((t) => t.dayDate)
      .sort()
    expect(days).toEqual(['2026-10-19', '2026-10-21'])
  })

  it('creates only the latest due repeat after days without opening the app', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await localDataSource.createRecurringRule({
      title: 'Stretch',
      kind: 'repeat',
      repeat: { unit: 'day', every: 1, startDate: '2026-10-19', endDate: null },
    })
    await localDataSource.syncRecurring('2026-10-22')
    const days = (await localDataSource.listTasksInRange('2026-10-19', '2026-10-25')).filter((t) => t.recurringRuleId === rule.id)
    expect(days.map((t) => t.dayDate)).toEqual(['2026-10-22'])
  })

  it('a canceled task doesn’t hold back the next one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await localDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1 })
    await localDataSource.syncRecurring('2026-10-19')
    const [monday] = await localDataSource.listTasksInRange('2026-10-19', '2026-10-19')
    await localDataSource.setTaskStatus(monday.id, 'canceled')
    await localDataSource.syncRecurring('2026-10-26')
    const [next] = await localDataSource.listTasksInRange('2026-10-26', '2026-10-26')
    expect(next).toMatchObject({ recurringRuleId: rule.id, status: 'todo' })
  })

  it('always creates a new rule’s first task, even when it’s days ahead', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await localDataSource.createRecurringRule({
      title: 'Pay rent',
      kind: 'repeat',
      repeat: { unit: 'month', every: 1, monthly: { type: 'date', days: [1] }, startDate: '2026-10-19', endDate: null },
      flagged: true,
    })
    await localDataSource.syncRecurring('2026-10-19')
    await localDataSource.syncRecurring('2026-10-20')
    const created = (await localDataSource.listTasksInRange('2026-10-01', '2026-12-31')).filter((t) => t.recurringRuleId === rule.id)
    expect(created.map((t) => [t.dayDate, t.flagged])).toEqual([['2026-11-01', true]])

    // Done early: the next waits for its own day (Dec 1), never ahead of time.
    await localDataSource.setTaskStatus(created[0].id, 'done')
    await localDataSource.syncRecurring('2026-10-21')
    const later = (await localDataSource.listTasksInRange('2026-10-01', '2026-12-31')).filter((t) => t.recurringRuleId === rule.id)
    expect(later).toHaveLength(1)
  })

  it('edits a rule’s pattern, flag and note', async () => {
    const rule = await localDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1 })
    const repeat = { unit: 'day' as const, every: 1, startDate: '2026-10-19', endDate: null }
    const updated = await localDataSource.updateRecurringRule(rule.id, { kind: 'repeat', repeat, flagged: true, note: 'Zoom link' })
    expect(updated).toMatchObject({ kind: 'repeat', repeat, flagged: true, note: 'Zoom link', title: 'Standup' })
  })

  it('an edit with applyToOpenTasks updates the open task (not done ones), keeping its day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await localDataSource.createRecurringRule({ title: 'Standup', kind: 'repeat', repeat: { unit: 'day', every: 1, startDate: '2026-10-19', endDate: null } })
    await localDataSource.syncRecurring('2026-10-19')
    const [open] = await localDataSource.listTasksInRange('2026-10-19', '2026-10-19')

    await localDataSource.updateRecurringRule(rule.id, { title: 'Team standup', note: 'Zoom', flagged: true, tagIds: ['w'], reminderTime: '09:00' }, { applyToOpenTasks: true })
    expect(await localDataSource.getTask(open.id)).toMatchObject({
      title: 'Team standup',
      note: 'Zoom',
      flagged: true,
      tagIds: ['w'],
      reminderTime: '09:00',
      dayDate: '2026-10-19',
    })

    await localDataSource.setTaskStatus(open.id, 'done')
    await localDataSource.updateRecurringRule(rule.id, { title: 'Daily sync' }, { applyToOpenTasks: true })
    expect((await localDataSource.getTask(open.id)).title).toBe('Team standup') // done: left as it was
  })
})

