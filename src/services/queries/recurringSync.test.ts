import { createRecurringSync } from './recurringSync'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

it('shares one materialization for simultaneous reads of the same day', async () => {
  const source = { syncRecurring: vi.fn(async () => {}) }
  const recurring = createRecurringSync(source)
  await Promise.all([recurring.ensure('2026-10-26'), recurring.ensure('2026-10-26')])
  await recurring.ensure('2026-10-26')
  expect(source.syncRecurring).toHaveBeenCalledTimes(1)
  await recurring.ensure('2026-10-27')
  expect(source.syncRecurring).toHaveBeenLastCalledWith('2026-10-27')
})

it('runs a follow-up pass for a rule change during materialization, without overlapping writes', async () => {
  const first = deferred()
  const source = { syncRecurring: vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined) }
  const recurring = createRecurringSync(source)
  const initial = recurring.ensure('2026-10-26')
  await Promise.resolve()
  recurring.invalidate()
  const afterEdit = recurring.ensure('2026-10-26')
  expect(source.syncRecurring).toHaveBeenCalledTimes(1)
  first.resolve()
  await Promise.all([initial, afterEdit])
  expect(source.syncRecurring).toHaveBeenCalledTimes(2)
  await recurring.ensure('2026-10-26')
  expect(source.syncRecurring).toHaveBeenCalledTimes(2)
})

it('rejects a failed pass and allows a later retry', async () => {
  const source = { syncRecurring: vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValue(undefined) }
  const recurring = createRecurringSync(source)
  await expect(recurring.ensure('2026-10-26')).rejects.toThrow('Storage unavailable')
  await recurring.ensure('2026-10-26')
  expect(source.syncRecurring).toHaveBeenCalledTimes(2)
})
