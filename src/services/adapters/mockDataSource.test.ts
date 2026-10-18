import { mockDataSource } from './mockDataSource'

describe('mockDataSource tasks', () => {
  it('lists range, bucket, and rondel tasks with tag filters', async () => {
    const a = await mockDataSource.createTask({
      title: 'A',
      dayDate: '2026-09-20',
      tagIds: ['x'],
    })
    const b = await mockDataSource.createTask({
      title: 'B',
      dayDate: null,
      bucket: 'bucket-list',
      tagIds: ['y'],
    })
    const c = await mockDataSource.createTask({
      title: 'C',
      dayDate: '2026-09-21',
      rondeled: true,
    })

    expect((await mockDataSource.listTasksInRange('2026-09-01', '2026-09-30')).map((t) => t.id)).toEqual([
      a.id,
      c.id,
    ])
    expect((await mockDataSource.listTasksInRange('2026-09-01', '2026-09-30', 'x')).map((t) => t.id)).toEqual([
      a.id,
    ])
    expect((await mockDataSource.listBucketTasks('bucket-list')).map((t) => t.id)).toEqual([b.id])
    expect((await mockDataSource.listBucketTasks('bucket-list', 'y')).map((t) => t.id)).toEqual([b.id])
    expect((await mockDataSource.listRondelItems()).map((t) => t.id)).toEqual([c.id])
  })

  it('creates, updates, advances, and sets status correctly', async () => {
    const task = await mockDataSource.createTask({ title: '  Task  ', dayDate: '2026-09-20' })
    expect(task.title).toBe('Task')
    expect(task.status).toBe('todo')

    const updated = await mockDataSource.updateTask(task.id, {
      title: 'Task+',
      tagIds: ['a'],
      note: 'n',
    })
    expect(updated.title).toBe('Task+')
    expect(updated.tagIds).toEqual(['a'])
    expect(updated.note).toBe('n')

    expect((await mockDataSource.advanceTask(task.id)).status).toBe('doing')
    const done = await mockDataSource.advanceTask(task.id)
    expect(done.status).toBe('done')
    expect(done.completedAt).not.toBeNull()
    const reopened = await mockDataSource.advanceTask(task.id)
    expect(reopened.status).toBe('todo')
    expect(reopened.completedAt).toBeNull()

    const canceled = await mockDataSource.setTaskStatus(task.id, 'canceled')
    expect(canceled.status).toBe('canceled')
    expect(canceled.completedAt).toBeNull()
  })

  it('moves tasks including reorder and rondel carry-forward behavior', async () => {
    const t1 = await mockDataSource.createTask({ title: 'One', dayDate: '2026-09-20' })
    const t2 = await mockDataSource.createTask({ title: 'Two', dayDate: '2026-09-20' })
    const t3 = await mockDataSource.createTask({ title: 'Three', dayDate: '2026-09-20' })

    await mockDataSource.moveTask(t3.id, { dayDate: '2026-09-20', rondeled: false }, { beforeId: t1.id })
    const order = await mockDataSource.listTasksInRange('2026-09-20', '2026-09-20')
    expect(order.map((t) => t.id)).toEqual([t3.id, t1.id, t2.id])

  })

  it('rondels a not-started task by moving it, keeping its first day', async () => {
    const task = await mockDataSource.createTask({ title: 'Todo', dayDate: '2026-09-21' })
    const moved = await mockDataSource.moveTask(task.id, { dayDate: '2026-09-22' }, { rondel: true })

    expect(moved.id).toBe(task.id)
    expect(moved.status).toBe('todo')
    expect(moved.rondelCount).toBe(1)
    expect(moved.originDate).toBe('2026-09-21')
    expect(await mockDataSource.listTasksInRange('2026-09-21', '2026-09-21')).toHaveLength(0)
  })

  it('rondels a doing task by keeping it on its day and carrying a doing copy forward', async () => {
    const task = await mockDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await mockDataSource.advanceTask(task.id)
    const copy = await mockDataSource.moveTask(task.id, { dayDate: '2026-09-22' }, { rondel: true })

    expect(copy.id).not.toBe(task.id)
    expect(copy.status).toBe('doing')
    expect(copy.rondelCount).toBe(1)
    expect(copy.originDate).toBe('2026-09-21')
    expect(copy.originTaskId).toBe(task.id)
    expect(copy.previousTaskId).toBe(task.id)

    // Changing the copy never touches the history left on Monday.
    await mockDataSource.setTaskStatus(copy.id, 'todo')
    const [monday] = await mockDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(monday.id).toBe(task.id)
    expect(monday.status).toBe('doing')
    expect(monday.carriedToId).toBe(copy.id)

    // A second hop keeps the lineage pointing at the original.
    await mockDataSource.advanceTask(copy.id)
    const next = await mockDataSource.moveTask(copy.id, { dayDate: '2026-09-23' }, { rondel: true })
    expect(next.rondelCount).toBe(2)
    expect(next.originTaskId).toBe(task.id)
    expect(next.previousTaskId).toBe(copy.id)
  })

  it('orders a day as active, then carried-forward history, then done', async () => {
    const carried = await mockDataSource.createTask({ title: 'Carried', dayDate: '2026-09-21' })
    const done = await mockDataSource.createTask({ title: 'Done', dayDate: '2026-09-21' })
    const active = await mockDataSource.createTask({ title: 'Active', dayDate: '2026-09-21' })
    await mockDataSource.advanceTask(carried.id)
    await mockDataSource.moveTask(carried.id, { dayDate: '2026-09-22' }, { rondel: true })
    await mockDataSource.setTaskStatus(done.id, 'done')

    const day = await mockDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(day.map((t) => t.id)).toEqual([active.id, carried.id, done.id])
  })

  it('turns a rondeled task into a regular task on today when started or finished', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 3, 12)) // Nov 3

    const waiting = await mockDataSource.createTask({ title: 'Waiting', dayDate: '2026-10-26' })
    await mockDataSource.moveTask(waiting.id, { dayDate: '2026-11-01', rondeled: true }, { rondel: true })
    const started = await mockDataSource.advanceTask(waiting.id)
    expect(started).toMatchObject({ status: 'doing', dayDate: '2026-11-03', rondeled: false })
    expect(started).toMatchObject({ rondelCount: 1, originDate: '2026-10-26', createdAt: waiting.createdAt })

    const other = await mockDataSource.createTask({ title: 'Other', dayDate: '2026-11-01', rondeled: true })
    const done = await mockDataSource.setTaskStatus(other.id, 'done')
    expect(done).toMatchObject({ status: 'done', dayDate: '2026-11-03', rondeled: false })
    expect(done.completedAt).not.toBeNull()
  })

  it('does not count giving a waiting item a day as another rondel', async () => {
    const task = await mockDataSource.createTask({ title: 'Waiting', dayDate: '2026-10-26' })
    await mockDataSource.moveTask(task.id, { dayDate: '2026-11-01', rondeled: true }, { rondel: true })
    const scheduled = await mockDataSource.moveTask(task.id, { dayDate: '2026-11-03' }, { rondel: true })
    expect(scheduled).toMatchObject({ dayDate: '2026-11-03', rondeled: false, rondelCount: 1 })

    const dream = await mockDataSource.createTask({ title: 'Dream', bucket: 'bucket-list' })
    const dated = await mockDataSource.moveTask(dream.id, { dayDate: '2026-11-03' }, { rondel: true })
    expect(dated).toMatchObject({ dayDate: '2026-11-03', bucket: null, rondelCount: 0 })

    // Out of the Bucket List into next week's container is scheduling too.
    const someday = await mockDataSource.createTask({ title: 'Someday', bucket: 'bucket-list' })
    const nextWeek = await mockDataSource.moveTask(someday.id, { dayDate: '2026-11-09', rondeled: true }, { rondel: true })
    expect(nextWeek).toMatchObject({ rondeled: true, bucket: null, rondelCount: 0, originDate: '2026-11-09' })

    // Pushing it off again still counts.
    const pushed = await mockDataSource.moveTask(task.id, { dayDate: '2026-11-04' }, { rondel: true })
    expect(pushed.rondelCount).toBe(2)
  })

  it('flags a task without reordering it, and carries the flag forward', async () => {
    const first = await mockDataSource.createTask({ title: 'First', dayDate: '2026-09-21' })
    const important = await mockDataSource.createTask({ title: 'Important', dayDate: '2026-09-21' })
    expect(important.flagged).toBe(false)

    await mockDataSource.updateTask(important.id, { flagged: true })
    const day = await mockDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(day.map((t) => [t.id, t.flagged])).toEqual([[first.id, false], [important.id, true]])

    await mockDataSource.advanceTask(important.id)
    const copy = await mockDataSource.moveTask(important.id, { dayDate: '2026-09-22' }, { rondel: true })
    expect(copy.flagged).toBe(true)
  })

  it('moves a reopened task to the top of its day', async () => {
    const first = await mockDataSource.createTask({ title: 'First', dayDate: '2026-09-21' })
    const reopened = await mockDataSource.createTask({ title: 'Reopened', dayDate: '2026-09-21' })
    await mockDataSource.setTaskStatus(reopened.id, 'done')
    await mockDataSource.advanceTask(reopened.id) // done → todo

    const day = await mockDataSource.listTasksInRange('2026-09-21', '2026-09-21')
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
    expect(await mockDataSource.listRondelItems()).toHaveLength(0)
    const [task] = await mockDataSource.listTasksInRange('2026-10-14', '2026-10-14')
    expect(task).toMatchObject({ id: 'stuck', rondeled: false, dayDate: '2026-10-14', rondelCount: 1 })
  })

  it('restores the history copy when its carried-forward copy is deleted', async () => {
    const monday = await mockDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await mockDataSource.advanceTask(monday.id)
    const tuesday = await mockDataSource.moveTask(monday.id, { dayDate: '2026-09-22' }, { rondel: true })

    await mockDataSource.deleteTask(tuesday.id)
    const [restored] = await mockDataSource.listTasksInRange('2026-09-21', '2026-09-21')
    expect(restored.carriedToId).toBeNull()
    expect(restored.status).toBe('doing')
  })

  it('keeps the chain linked when a middle history copy is deleted', async () => {
    const monday = await mockDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await mockDataSource.advanceTask(monday.id)
    const tuesday = await mockDataSource.moveTask(monday.id, { dayDate: '2026-09-22' }, { rondel: true })
    const wednesday = await mockDataSource.moveTask(tuesday.id, { dayDate: '2026-09-23' }, { rondel: true })

    await mockDataSource.deleteTask(tuesday.id)
    const week = await mockDataSource.listTasksInRange('2026-09-21', '2026-09-23')
    expect(week.find((t) => t.id === monday.id)?.carriedToId).toBe(wednesday.id)
    expect(week.find((t) => t.id === wednesday.id)?.previousTaskId).toBe(monday.id)
  })

  it('refuses to rondel done tasks and carried-forward history', async () => {
    const done = await mockDataSource.createTask({ title: 'Done', dayDate: '2026-09-21' })
    await mockDataSource.setTaskStatus(done.id, 'done')
    await expect(
      mockDataSource.moveTask(done.id, { dayDate: '2026-09-22' }, { rondel: true }),
    ).rejects.toThrow('can not be rondeled')

    const doing = await mockDataSource.createTask({ title: 'Doing', dayDate: '2026-09-21' })
    await mockDataSource.advanceTask(doing.id)
    await mockDataSource.moveTask(doing.id, { dayDate: '2026-09-22' }, { rondel: true })
    await expect(
      mockDataSource.moveTask(doing.id, { dayDate: '2026-09-23' }, { rondel: true }),
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
    const [task] = await mockDataSource.listTasksInRange('2026-09-01', '2026-09-01')
    expect(task).toMatchObject({
      flagged: false,
      note: 'kept',
      rondelCount: 2,
      originDate: '2026-09-01',
      originTaskId: null,
      previousTaskId: null,
      carriedToId: null,
    })
    const copy = await mockDataSource.moveTask('old', { dayDate: '2026-09-02' }, { rondel: true })
    expect(copy.rondelCount).toBe(3)
  })

  it('throws for missing tasks', async () => {
    await expect(mockDataSource.updateTask('missing', { title: 'x' })).rejects.toThrow('Task not found')
    await expect(mockDataSource.deleteTask('missing')).rejects.toThrow('Task not found')
  })
})

describe('mockDataSource tags/settings', () => {
  it('creates, updates, deletes tags and unlinks deleted tags from tasks', async () => {
    const tag = await mockDataSource.createTag({ name: '  Work  ' })
    expect(tag.name).toBe('Work')
    expect(tag.color).toBe('#3b82f6')
    const updated = await mockDataSource.updateTag(tag.id, { color: '#111111' })
    expect(updated.color).toBe('#111111')

    const task = await mockDataSource.createTask({
      title: 'Tagged',
      dayDate: '2026-09-20',
      tagIds: [tag.id],
    })
    await mockDataSource.deleteTag(tag.id)
    const after = await mockDataSource.listTasksInRange('2026-09-01', '2026-09-30')
    expect(after.find((t) => t.id === task.id)?.tagIds).toEqual([])
    await expect(mockDataSource.updateTag('missing', { name: 'x' })).rejects.toThrow('Tag not found')
  })

  it('reads and updates settings', async () => {
    const defaults = await mockDataSource.getSettings()
    expect(defaults.weekStartDay).toBe(1)
    expect(defaults.dayStartTime).toBe('09:00')
    const updated = await mockDataSource.updateSettings({ weekStartDay: 0, endOfDayTime: '18:00' })
    expect(updated.weekStartDay).toBe(0)
    expect(updated.endOfDayTime).toBe('18:00')
    expect((await mockDataSource.getSettings()).weekStartDay).toBe(0)
  })
})

describe('mockDataSource recurring', () => {
  it('creates, lists, updates, and deletes recurring rules', async () => {
    const rule = await mockDataSource.createRecurringRule({
      title: '  Weekly  ',
      kind: 'weekly-on',
      weekday: 2,
    })
    expect(rule.title).toBe('Weekly')
    expect((await mockDataSource.listRecurringRules())).toHaveLength(1)
    const updated = await mockDataSource.updateRecurringRule(rule.id, {
      kind: 'monthly-on',
      dayOfMonth: 15,
      note: 'x',
    })
    expect(updated.kind).toBe('monthly-on')
    expect(updated.dayOfMonth).toBe(15)
    expect(updated.note).toBe('x')
    await mockDataSource.deleteRecurringRule(rule.id)
    expect(await mockDataSource.listRecurringRules()).toHaveLength(0)
    await expect(mockDataSource.updateRecurringRule('missing', { title: 'x' })).rejects.toThrow(
      'Recurring rule not found',
    )
  })

  it('syncs recurring tasks and prevents duplicate pending start-rule items', async () => {
    // Rules start from their creation date, so pin the clock to keep the
    // expected occurrences inside the ranges below.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 15, 12))
    const startRule = await mockDataSource.createRecurringRule({
      title: 'Start weekly',
      kind: 'weekly-start',
    })
    const monthlyOn = await mockDataSource.createRecurringRule({
      title: 'Billing',
      kind: 'monthly-on',
      dayOfMonth: 1,
    })

    await mockDataSource.syncRecurring('2026-10-31')
    await mockDataSource.syncRecurring('2026-10-31')

    const rondelItems = await mockDataSource.listRondelItems()
    const startPending = rondelItems.filter((t) => t.recurringRuleId === startRule.id && t.status !== 'done')
    expect(startPending).toHaveLength(1)

    const rangeTasks = await mockDataSource.listTasksInRange('2026-09-01', '2026-10-31')
    expect(rangeTasks.some((t) => t.recurringRuleId === monthlyOn.id)).toBe(true)

    await mockDataSource.setTaskStatus(startPending[0].id, 'done')
    await mockDataSource.syncRecurring('2026-11-30')
    // The finished one became a regular done task on today; the next one waits in its container.
    const afterDone = await mockDataSource.listRondelItems()
    const waitingForRule = afterDone.filter((t) => t.recurringRuleId === startRule.id)
    expect(waitingForRule).toHaveLength(1)
    expect(waitingForRule[0].status).toBe('todo')
    const [finished] = await mockDataSource.listTasksInRange('2026-09-15', '2026-09-15')
    expect(finished).toMatchObject({ id: startPending[0].id, status: 'done', rondeled: false })
    vi.useRealTimers()
  })

  it('gives the same recurring occurrence the same id on every device', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 14, 9)) // Mon Sep 14
    const rule = await mockDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1 })
    await mockDataSource.syncRecurring('2026-09-14')
    const [task] = await mockDataSource.listTasksInRange('2026-09-14', '2026-09-14')
    expect(task.id).toBe(`rec:${rule.id}:2026-09-14`)
  })

  it('keeps reminder times on tasks and lists upcoming ones', async () => {
    const call = await mockDataSource.createTask({ title: 'Call dentist', dayDate: '2026-10-20' })
    expect(call.reminderTime).toBeNull()
    await mockDataSource.updateTask(call.id, { reminderTime: '09:30' })
    const past = await mockDataSource.createTask({ title: 'Yesterday', dayDate: '2026-10-18' })
    await mockDataSource.updateTask(past.id, { reminderTime: '08:00' })
    const finished = await mockDataSource.createTask({ title: 'Done one', dayDate: '2026-10-20' })
    await mockDataSource.updateTask(finished.id, { reminderTime: '10:00' })
    await mockDataSource.setTaskStatus(finished.id, 'done')

    const upcoming = await mockDataSource.listUpcomingReminders('2026-10-19')
    expect(upcoming.map((t) => [t.title, t.reminderTime])).toEqual([['Call dentist', '09:30']])

    await mockDataSource.updateTask(call.id, { reminderTime: null })
    expect(await mockDataSource.listUpcomingReminders('2026-10-19')).toEqual([])
  })

  it('copies a rule’s reminder to its tasks, and can update the rule plus its open tasks', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 14, 7)) // Mon Sep 14
    const rule = await mockDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1, reminderTime: '09:00' })
    await mockDataSource.syncRecurring('2026-09-14')
    const [today] = await mockDataSource.listTasksInRange('2026-09-14', '2026-09-14')
    expect(today.reminderTime).toBe('09:00')

    // "All": the rule and its unfinished tasks get the new time.
    await mockDataSource.updateRecurringRule(rule.id, { reminderTime: '09:15' }, { applyToOpenTasks: true })
    expect((await mockDataSource.listRecurringRules())[0].reminderTime).toBe('09:15')
    const [updated] = await mockDataSource.listTasksInRange('2026-09-14', '2026-09-14')
    expect(updated.reminderTime).toBe('09:15')
  })

  it('lists tasks left undone on past days, oldest first, and can mark them done on their day', async () => {
    const monday = await mockDataSource.createTask({ title: 'Forgot to check off', dayDate: '2026-10-12' })
    const tuesday = await mockDataSource.createTask({ title: 'Still doing', dayDate: '2026-10-13' })
    await mockDataSource.advanceTask(tuesday.id)
    await mockDataSource.createTask({ title: 'Today', dayDate: '2026-10-19' })
    const finished = await mockDataSource.createTask({ title: 'Finished', dayDate: '2026-10-12' })
    await mockDataSource.setTaskStatus(finished.id, 'done')

    const left = await mockDataSource.listLeftUndone('2026-10-19')
    expect(left.map((t) => t.title)).toEqual(['Forgot to check off', 'Still doing'])

    const done = await mockDataSource.setTaskStatus(monday.id, 'done', { onItsDay: true })
    expect(done.dayDate).toBe('2026-10-12')
    expect(new Date(done.completedAt!).getDate()).toBe(12) // completed that day, local time
    expect((await mockDataSource.listLeftUndone('2026-10-19')).map((t) => t.title)).toEqual(['Still doing'])
  })

  it('creates the next repeat only once the previous one is done, skipping missed ones', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await mockDataSource.createRecurringRule({
      title: 'Gym',
      kind: 'repeat',
      repeat: { unit: 'week', every: 1, weekdays: [1, 3, 5], startDate: '2026-10-19', endDate: null },
    })
    const gymDays = async () =>
      (await mockDataSource.listTasksInRange('2026-10-19', '2026-11-01'))
        .filter((t) => t.recurringRuleId === rule.id)
        .map((t) => t.dayDate)

    await mockDataSource.syncRecurring('2026-10-19')
    expect(await gymDays()).toEqual(['2026-10-19'])

    // Monday's is still open (doing counts), so Wednesday's isn't created.
    const [monday] = await mockDataSource.listTasksInRange('2026-10-19', '2026-10-19')
    await mockDataSource.setTaskStatus(monday.id, 'doing')
    await mockDataSource.syncRecurring('2026-10-21')
    expect(await gymDays()).toEqual(['2026-10-19'])

    // Finished on Thursday: Wednesday's is skipped; the next one is Friday's.
    await mockDataSource.setTaskStatus(monday.id, 'done')
    await mockDataSource.syncRecurring('2026-10-22')
    expect(await gymDays()).toEqual(['2026-10-19'])
    await mockDataSource.syncRecurring('2026-10-23')
    expect(await gymDays()).toEqual(['2026-10-19', '2026-10-23'])
  })

  it('brings in today’s repeat when the open one is finished later that day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await mockDataSource.createRecurringRule({
      title: 'Stretch',
      kind: 'repeat',
      repeat: { unit: 'day', every: 1, startDate: '2026-10-19', endDate: null },
    })
    await mockDataSource.syncRecurring('2026-10-19')
    await mockDataSource.syncRecurring('2026-10-20') // Monday's still open
    const [monday] = await mockDataSource.listTasksInRange('2026-10-19', '2026-10-19')
    await mockDataSource.setTaskStatus(monday.id, 'done')
    await mockDataSource.syncRecurring('2026-10-20')
    const days = (await mockDataSource.listTasksInRange('2026-10-19', '2026-10-25'))
      .filter((t) => t.recurringRuleId === rule.id)
      .map((t) => t.dayDate)
    expect(days).toEqual(['2026-10-19', '2026-10-20'])
  })

  it('a canceled task doesn’t hold back the next one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 8)) // Mon Oct 19
    const rule = await mockDataSource.createRecurringRule({ title: 'Standup', kind: 'weekly-on', weekday: 1 })
    await mockDataSource.syncRecurring('2026-10-19')
    const [monday] = await mockDataSource.listTasksInRange('2026-10-19', '2026-10-19')
    await mockDataSource.setTaskStatus(monday.id, 'canceled')
    await mockDataSource.syncRecurring('2026-10-26')
    const [next] = await mockDataSource.listTasksInRange('2026-10-26', '2026-10-26')
    expect(next).toMatchObject({ recurringRuleId: rule.id, status: 'todo' })
  })
})
