import { localDataSource as data } from './localDataSource'
import { buildDashboard } from '../../domain/reports'

function at(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

it('persists Bucket List creation and scheduling dates while scheduling keeps the rondel count at zero', async () => {
  at('2026-10-19T12:00:00Z')
  const task = await data.createTask({ title: 'Try Pilates', bucket: 'bucket-list' })
  expect(task.bucketHistory).toEqual([{ id: expect.any(String), kind: 'added', occurredAt: '2026-10-19T12:00:00.000Z' }])
  at('2026-10-20T12:00:00Z')
  const scheduled = await data.moveTask(task.id, { dayDate: '2026-11-02' }, { rondel: true })
  expect(scheduled.rondelCount).toBe(0)
  expect(scheduled.rondelHistory).toEqual([])
  expect(scheduled.bucketHistory?.map((event) => event.kind)).toEqual(['added', 'scheduled'])
  expect((await data.getTask(task.id)).bucketHistory).toEqual(scheduled.bucketHistory)
  const report = buildDashboard(await data.listAllTasks(), [], { start: '2026-10-19', end: '2026-10-20' })
  expect(report.bucketActivity).toEqual({ created: 1, actualized: 1 })
})

it('stores a doing task transfer on the source once and retains it after a successor leaves Bucket List', async () => {
  at('2026-10-19T12:00:00Z')
  const task = await data.createTask({ title: 'Park the work', dayDate: '2026-10-19' })
  await data.advanceTask(task.id)
  at('2026-10-20T12:00:00Z')
  const copy = await data.moveTask(task.id, { bucket: 'bucket-list' }, { rondel: true })
  expect(copy.id).not.toBe(task.id)
  expect(copy.bucketHistory).toEqual([])
  expect((await data.getTask(task.id)).bucketHistory?.map((event) => event.kind)).toEqual(['added'])
  at('2026-10-21T12:00:00Z')
  const scheduled = await data.moveTask(copy.id, { dayDate: '2026-10-22' }, { rondel: true })
  expect(scheduled.rondelCount).toBe(1)
  expect(scheduled.bucketHistory?.map((event) => event.kind)).toEqual(['scheduled'])
  const report = buildDashboard(await data.listAllTasks(), [], { start: '2026-10-19', end: '2026-10-21' })
  expect(report.bucketActivity).toEqual({ created: 0, actualized: 0 })
  expect(report.activity.rondeled).toBe(1)
})

it('records plain bucket transfers, ignores reordering and cancellation, and preserves the existing rondel rules', async () => {
  const task = await data.createTask({ title: 'A dream', bucket: 'bucket-list' })
  await data.moveTask(task.id, { bucket: 'bucket-list' })
  expect((await data.getTask(task.id)).bucketHistory).toHaveLength(1)
  const scheduled = await data.moveTask(task.id, { dayDate: '2026-10-20' })
  expect(scheduled.bucketHistory).toHaveLength(2)
  expect(scheduled.rondelCount).toBe(0)
  const back = await data.moveTask(task.id, { bucket: 'bucket-list' })
  expect(back.bucketHistory).toHaveLength(3)
  expect(back.rondelCount).toBe(0)
  await data.setTaskStatus(task.id, 'canceled')
  expect((await data.getTask(task.id)).bucketHistory).toHaveLength(3)
})

it('actualizes a waiting Bucket List idea on its real day, while canceling a waiting idea does not actualize it', async () => {
  at('2026-10-19T12:00:00Z')
  const task = await data.createTask({ title: 'Someday soon', bucket: 'bucket-list' })
  await data.moveTask(task.id, { dayDate: '2026-10-26', rondeled: true }, { rondel: true })
  const report = (start: string, end: string) => data.listAllTasks().then((tasks) => buildDashboard(tasks, [], { start, end }))
  expect((await report('2026-10-19', '2026-10-31')).bucketActivity).toEqual({ created: 1, actualized: 0 })
  at('2026-10-27T12:00:00Z')
  await data.setTaskStatus(task.id, 'doing')
  expect((await report('2026-10-26', '2026-10-26')).bucketActivity.actualized).toBe(0)
  expect((await report('2026-10-27', '2026-10-27')).bucketActivity.actualized).toBe(1)
  const canceled = await data.createTask({ title: 'Let this go', bucket: 'bucket-list' })
  await data.moveTask(canceled.id, { dayDate: '2026-10-26', rondeled: true }, { rondel: true })
  await data.setTaskStatus(canceled.id, 'canceled')
  expect((await report('2026-10-19', '2026-10-31')).bucketActivity).toEqual({ created: 2, actualized: 1 })
})
