import { buildDashboard } from '../../domain/reports'
import { reportFixtureTask as task } from '../../test/reportFixtures'
import { localDataSource as data } from './localDataSource'

const originalDay = '2026-10-20'
const transferDay = '2026-10-27'

async function actualizedOn(day: string) {
  const tasks = await data.listAllTasks()
  const saved = localStorage.getItem('rondel.v6.tasks')
  const count = buildDashboard(tasks, [], { start: day, end: day }).bucketActivity.actualized
  expect(localStorage.getItem('rondel.v6.tasks')).toBe(saved)
  return count
}

it.each([false, true])('preserves legacy first actualization through repeat Bucket List transfers (rondel: %s)', async (rondel) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${transferDay}T12:00:00Z`))
  localStorage.setItem('rondel.v6.tasks', JSON.stringify([
    task({ id: 'legacy', bucketListOrigin: true, originDate: originalDay, dayDate: originalDay }),
  ]))
  expect(await actualizedOn(originalDay)).toBe(1)
  await data.moveTask('legacy', { bucket: 'bucket-list' }, { rondel })
  expect(await actualizedOn(originalDay)).toBe(1)
  await data.moveTask('legacy', { dayDate: '2026-10-28' }, { rondel })
  expect(await actualizedOn(originalDay)).toBe(1)
  expect(await actualizedOn(transferDay)).toBe(0)
})

it('counts a legacy waiting idea on its first real scheduling action, even after parking it in Bucket List', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${transferDay}T12:00:00Z`))
  localStorage.setItem('rondel.v6.tasks', JSON.stringify([
    task({ id: 'waiting', bucketListOrigin: true, originDate: originalDay, dayDate: originalDay, rondeled: true }),
  ]))
  expect(await actualizedOn(originalDay)).toBe(0)
  await data.moveTask('waiting', { bucket: 'bucket-list' })
  await data.moveTask('waiting', { dayDate: '2026-10-28' })
  expect(await actualizedOn(originalDay)).toBe(0)
  expect(await actualizedOn(transferDay)).toBe(1)
  await data.moveTask('waiting', { bucket: 'bucket-list' })
  await data.moveTask('waiting', { dayDate: '2026-10-29' })
  expect(await actualizedOn(originalDay)).toBe(0)
  expect(await actualizedOn(transferDay)).toBe(1)
})

it('keeps legacy actualization across a doing copy and reopening a canceled task', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${transferDay}T12:00:00Z`))
  localStorage.setItem('rondel.v6.tasks', JSON.stringify([
    task({ id: 'legacy', status: 'doing', bucketListOrigin: true, originDate: originalDay, dayDate: originalDay }),
  ]))
  const copy = await data.moveTask('legacy', { bucket: 'bucket-list' }, { rondel: true })
  await data.moveTask(copy.id, { dayDate: '2026-10-28' }, { rondel: true })
  await data.setTaskStatus(copy.id, 'canceled')
  await data.setTaskStatus(copy.id, 'todo')
  expect(await actualizedOn(originalDay)).toBe(1)
  expect(await actualizedOn(transferDay)).toBe(0)
})
