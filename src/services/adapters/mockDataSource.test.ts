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

    await mockDataSource.setTaskStatus(t1.id, 'done')
    const moved = await mockDataSource.moveTask(
      t1.id,
      { dayDate: '2026-09-27', rondeled: true, bucket: null },
      { rondel: true },
    )
    expect(moved.status).toBe('todo')
    expect(moved.completedAt).toBeNull()
    expect(moved.rondelCount).toBe(1)
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
    const afterDone = await mockDataSource.listRondelItems()
    expect(afterDone.filter((t) => t.recurringRuleId === startRule.id)).toHaveLength(2)
  })
})
