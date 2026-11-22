import { test, expect } from '@playwright/test'

test('isolated IndexedDB store commits atomically, fences concurrent writers and reopens coherently', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const path = '/src/services/storage/transactional/snapshotStore.ts'
    const { openSnapshotStore } = await import(/* @vite-ignore */ path)
    const name = `test-snapshot-${crypto.randomUUID()}`
    const snapshot = { tasks: [], tags: [], rules: [], settings: null, meta: { updated: { tasks: {}, tags: {}, rules: {} }, deleted: { tasks: {}, tags: {}, rules: {} }, settingsUpdated: null } }
    const code = async (operation: Promise<unknown>) => { try { await operation; return 'success' } catch (e) { return (e as { code?: string; name?: string }).code ?? (e as Error).name } }
    const a = await openSnapshotStore(name)
    const absent = await code(a.read())
    await a.initialize(snapshot)
    const duplicate = await code(a.initialize(snapshot))
    const b = await openSnapshotStore(name)
    const competing = await Promise.all([
      code(a.update({ revision: 0, epoch: 0 }, (s: typeof snapshot) => s, true)),
      code(b.update({ revision: 0, epoch: 0 }, (s: typeof snapshot) => s)),
    ])
    const committed = await b.read()
    const staleEpoch = await code(b.update({ revision: 1, epoch: 0 }, (s: typeof snapshot) => s))
    const transformFailure = await code(a.update(committed.active, () => { throw new Error('transform failed') }))
    const unchanged = JSON.stringify(await a.read()) === JSON.stringify(committed)
    committed.active.snapshot.tags.push({ id: 'outside' })
    const detached = (await a.read()).active.snapshot.tags.length === 0
    a.close(); b.close()
    const reopened = await openSnapshotStore(name)
    const final = await reopened.read()
    reopened.close()
    indexedDB.deleteDatabase(name)
    return { absent, duplicate, competing, staleEpoch, transformFailure, unchanged, detached, final }
  })
  expect(result).toMatchObject({ absent: 'absent', duplicate: 'exists', competing: ['success', 'stale'], staleEpoch: 'stale', transformFailure: 'Error', unchanged: true, detached: true })
  expect(result.final).toMatchObject({ active: { revision: 1, epoch: 1 }, previous: { revision: 0 }, control: { epoch: 1, syncHeld: true } })
})

for (const boundary of ['active', 'previous', 'control']) {
  test(`aborts after successful ${boundary} request without publishing any partial state`, async ({ page }) => {
    await page.goto('/')
    const result = await page.evaluate(async key => {
      const path = '/src/services/storage/transactional/snapshotStore.ts'
      const { openSnapshotStore } = await import(/* @vite-ignore */ path)
      const name = `test-abort-${crypto.randomUUID()}`
      const store = await openSnapshotStore(name)
      const snapshot = { tasks: [], tags: [], rules: [], settings: null, meta: { updated: { tasks: {}, tags: {}, rules: {} }, deleted: { tasks: {}, tags: {}, rules: {} }, settingsUpdated: null } }
      await store.initialize(snapshot)
      await store.update({ revision: 0, epoch: 0 }, (s: typeof snapshot) => s, true)
      const before = await store.read()
      const original = IDBObjectStore.prototype.put
      let requestSucceeded = false
      IDBObjectStore.prototype.put = function (value, recordKey) {
        const request = original.call(this, value, recordKey)
        if (this.name === 'snapshots' && recordKey === key) request.addEventListener('success', () => {
          requestSucceeded = true
          request.transaction!.abort()
        })
        return request
      }
      let resolved = false
      try { await store.update(before.active, (s: typeof snapshot) => ({ ...s, settings: { weekStartDay: 2 } }), true); resolved = true }
      catch { /* Expected transaction abort after a successful request. */ }
      finally { IDBObjectStore.prototype.put = original }
      const same = JSON.stringify(await store.read()) === JSON.stringify(before)
      store.close()
      const reopened = await openSnapshotStore(name)
      const after = await reopened.read()
      reopened.close(); indexedDB.deleteDatabase(name)
      return { requestSucceeded, resolved, same, reopenedSame: JSON.stringify(after) === JSON.stringify(before) }
    }, boundary)
    expect(result).toEqual({ requestSucceeded: true, resolved: false, same: true, reopenedSame: true })
  })
}

test('failed write requests preserve state and schema/corruption are distinct from absence', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const path = '/src/services/storage/transactional/snapshotStore.ts'
    const { openSnapshotStore } = await import(/* @vite-ignore */ path)
    const name = `test-errors-${crypto.randomUUID()}`
    const store = await openSnapshotStore(name)
    const snapshot = { tasks: [], tags: [], rules: [], settings: null, meta: { updated: { tasks: {}, tags: {}, rules: {} }, deleted: { tasks: {}, tags: {}, rules: {} }, settingsUpdated: null } }
    await store.initialize(snapshot)
    const before = await store.read()
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'snapshots' && key === 'previous') throw new DOMException('Injected full storage', 'QuotaExceededError')
      return original.call(this, value, key)
    }
    let failure = ''
    try { await store.update(before.active, (s: typeof snapshot) => s, true) }
    catch (error) { failure = (error as Error).name }
    finally { IDBObjectStore.prototype.put = original }
    const unchanged = JSON.stringify(await store.read()) === JSON.stringify(before)
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    const write = (value: unknown) => new Promise<void>((resolve, reject) => {
      const tx = raw.transaction('snapshots', 'readwrite')
      tx.objectStore('snapshots').put(value, 'control')
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error)
    })
    const code = async () => { try { await store.read(); return 'success' } catch (error) { return (error as { code: string }).code } }
    await write({ version: 2, data: before.control })
    const unknown = await code()
    await write({ version: 1, data: { epoch: 9, syncHeld: false } })
    const corrupt = await code()
    store.close(); raw.close(); indexedDB.deleteDatabase(name)
    return { failure, unchanged, unknown, corrupt }
  })
  expect(result).toEqual({ failure: 'QuotaExceededError', unchanged: true, unknown: 'schema', corrupt: 'corrupt' })
})
