import { readMeta } from '../storage/localStore'
import { localDataSource as data } from './localDataSource'

const firstDay = '2026-10-19'
const nextDay = '2026-10-20'

function at(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

describe('task reporting observations', () => {
  it('records each rondel once on its source and carries totals into new doing copies', async () => {
    at('2026-10-19T09:00:00Z')
    const task = await data.createTask({ title: 'Ship', dayDate: firstDay })
    const moved = await data.moveTask(task.id, { dayDate: nextDay }, { rondel: true })
    expect(moved).toMatchObject({ id: task.id, rondelCount: 1, doingRondelCount: 0 })
    expect(moved.rondelHistory).toEqual([expect.objectContaining({
      occurredAt: '2026-10-19T09:00:00.000Z', fromDate: firstDay, toDate: nextDay,
      fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: null, status: 'todo',
    })])

    const started = await data.setTaskStatus(task.id, 'doing')
    at('2026-10-20T10:00:00Z')
    const copy = await data.moveTask(task.id, { dayDate: '2026-10-21' }, { rondel: true })
    expect(copy).toMatchObject({ rondelCount: 2, doingRondelCount: 1, startedAt: started.startedAt, rondelHistory: [] })
    const source = await data.getTask(task.id)
    expect(source.rondelHistory.map((entry) => entry.status)).toEqual(['todo', 'doing'])
    expect(new Set(source.rondelHistory.map((entry) => entry.id)).size).toBe(2)
    expect((await data.listAllTasks()).flatMap((entry) => entry.rondelHistory)).toHaveLength(2)
  })

  it('records in-place doing rondels from containers but excludes scheduling and dragging', async () => {
    const bucket = await data.createTask({ title: 'Dream', bucket: 'bucket-list' })
    const scheduled = await data.moveTask(bucket.id, { dayDate: firstDay }, { rondel: true })
    expect(scheduled).toMatchObject({ rondelCount: 0, rondelHistory: [], bucketListOrigin: true })
    await data.setTaskStatus(bucket.id, 'doing')
    const waiting = await data.moveTask(bucket.id, { dayDate: nextDay, rondeled: true }, { rondel: true })
    const pushed = await data.moveTask(waiting.id, { dayDate: '2026-10-26', rondeled: true }, { rondel: true })
    expect(pushed).toMatchObject({ id: waiting.id, rondelCount: 2, doingRondelCount: 2, bucketListOrigin: true })
    expect(pushed.rondelHistory).toHaveLength(1)
    const dated = await data.moveTask(pushed.id, { dayDate: '2026-10-27' }, { rondel: true })
    const dragged = await data.moveTask(dated.id, { dayDate: '2026-10-28' })
    expect(dragged).toMatchObject({ rondelCount: 2, doingRondelCount: 2, rondelHistory: pushed.rondelHistory })
  })

  it('keeps first start through completion and reopening; direct completion never invents a start', async () => {
    at('2026-10-19T09:00:00Z')
    const task = await data.createTask({ title: 'Started once', dayDate: firstDay })
    await data.advanceTask(task.id)
    at('2026-10-20T12:00:00Z')
    await data.setTaskStatus(task.id, 'done')
    await data.advanceTask(task.id)
    const restarted = await data.advanceTask(task.id)
    expect(restarted).toMatchObject({ startedAt: '2026-10-19T09:00:00.000Z', completedAt: null })
    const direct = await data.createTask({ title: 'Already done', dayDate: firstDay })
    expect(await data.setTaskStatus(direct.id, 'done', { onItsDay: true })).toMatchObject({ startedAt: null })
  })

  it('preserves Bucket List provenance without relabeling parked scheduled work', async () => {
    const dated = await data.createTask({ title: 'Park me', dayDate: firstDay })
    expect(await data.moveTask(dated.id, { bucket: 'bucket-list' }, { rondel: true })).toMatchObject({ bucketListOrigin: false })
    const dream = await data.createTask({ title: 'Dream', bucket: 'bucket-list' })
    expect(await data.moveTask(dream.id, { dayDate: nextDay }, { rondel: true })).toMatchObject({ bucketListOrigin: true })
    const fresh = await data.createTask({ title: dream.title, dayDate: nextDay })
    expect(fresh).toMatchObject({ bucketListOrigin: false, startedAt: null, rondelCount: 0, rondelHistory: [] })
  })

  it('normalizes legacy gaps without writing or marking another task edited', async () => {
    at('2026-10-19T09:00:00Z')
    const old = await data.createTask({ title: 'Old', dayDate: firstDay })
    const other = await data.createTask({ title: 'Other', dayDate: firstDay })
    const records = JSON.parse(localStorage.getItem('rondel.v6.tasks')!) as Record<string, unknown>[]
    for (const key of ['doingRondelCount', 'startedAt', 'bucketListOrigin', 'canceledAt', 'rondelHistory']) delete records[0][key]
    records[0].rondelCount = 3
    localStorage.setItem('rondel.v6.tasks', JSON.stringify(records))
    const saved = localStorage.getItem('rondel.v6.tasks')
    const stamp = readMeta().updated.tasks[old.id]
    expect(await data.getTask(old.id)).toMatchObject({ doingRondelCount: null, startedAt: null, bucketListOrigin: null, rondelHistory: [] })
    expect(localStorage.getItem('rondel.v6.tasks')).toBe(saved)
    at('2026-10-20T12:00:00Z')
    await data.updateTask(other.id, { note: 'Only this changed' })
    expect(readMeta().updated.tasks[old.id]).toBe(stamp)
    const moved = await data.moveTask(old.id, { dayDate: nextDay }, { rondel: true })
    expect(moved.doingRondelCount).toBeNull()
    await data.moveTask(old.id, { bucket: 'bucket-list' }, { rondel: true })
    expect((await data.getTask(old.id)).bucketListOrigin).toBeNull()
  })
})

describe('task cancellation', () => {
  it('moves a canceled waiting item to today below active and completed tasks', async () => {
    at('2026-10-19T09:00:00Z')
    const active = await data.createTask({ title: 'Still planned', dayDate: firstDay })
    const finished = await data.createTask({ title: 'Finished', dayDate: firstDay })
    await data.setTaskStatus(finished.id, 'done')
    const waiting = await data.createTask({ title: 'No longer needed', dayDate: '2026-11-01', rondeled: true })

    const canceled = await data.setTaskStatus(waiting.id, 'canceled')

    expect(canceled).toMatchObject({
      status: 'canceled', dayDate: firstDay, rondeled: false,
      canceledAt: '2026-10-19T09:00:00.000Z', completedAt: null,
      rondelCount: 0, rondelHistory: [],
    })
    expect((await data.listTasksInRange(firstDay, firstDay)).map((task) => task.id))
      .toEqual([active.id, finished.id, waiting.id])
    expect(await data.listRondelItems()).toEqual([])
  })

  it('preserves the live task and its history, with cancellation time and no completion', async () => {
    at('2026-10-19T09:00:00Z')
    const task = await data.createTask({ title: 'Stop here', dayDate: firstDay })
    await data.advanceTask(task.id)
    const copy = await data.moveTask(task.id, { dayDate: nextDay }, { rondel: true })
    const canceled = await data.setTaskStatus(copy.id, 'canceled')
    expect(canceled).toMatchObject({ status: 'canceled', canceledAt: '2026-10-19T09:00:00.000Z', completedAt: null, rondelCount: 1 })
    expect((await data.getTask(task.id)).carriedToId).toBe(copy.id)
    expect(await data.listAllTasks()).toHaveLength(2)
    await expect(data.moveTask(copy.id, { dayDate: firstDay })).rejects.toThrow('Reopen')
    await expect(data.moveTask(copy.id, { dayDate: firstDay }, { rondel: true })).rejects.toThrow('Reopen')
    expect(await data.advanceTask(copy.id)).toMatchObject({ status: 'todo', canceledAt: null, startedAt: canceled.startedAt })
  })

  it('allows canceling and reopening an undated Bucket List item', async () => {
    const task = await data.createTask({ title: 'Someday', bucket: 'bucket-list' })
    expect(await data.setTaskStatus(task.id, 'canceled')).toMatchObject({ status: 'canceled', dayDate: null, bucketListOrigin: true })
    expect(await data.setTaskStatus(task.id, 'todo')).toMatchObject({ status: 'todo', canceledAt: null, dayDate: null, bucket: 'bucket-list' })
  })

  it('keeps canceled start-rule occurrences when the next recurrence is materialized', async () => {
    at('2026-10-19T09:00:00Z')
    const rule = await data.createRecurringRule({ title: 'Weekly', kind: 'weekly-start' })
    await data.syncRecurring(firstDay)
    const [first] = await data.listAllTasks()
    await data.setTaskStatus(first.id, 'canceled')
    await data.syncRecurring('2026-10-26')
    await data.syncRecurring('2026-10-27')
    const tasks = (await data.listAllTasks()).filter((task) => task.recurringRuleId === rule.id)
    expect(tasks.map((task) => task.status).sort()).toEqual(['canceled', 'todo'])
  })
})
