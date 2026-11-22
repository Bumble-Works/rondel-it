import { EMPTY_META, type Snapshot } from '../../../domain/sync'
import { SnapshotStore } from './snapshotStore'

const snapshot = (): Snapshot => ({ tasks: [], tags: [], rules: [], settings: null, meta: structuredClone(EMPTY_META) })
const closedDb = () => ({
  addEventListener: vi.fn(),
  close: vi.fn(),
  transaction: vi.fn(() => { throw new DOMException('The database connection is closing.', 'InvalidStateError') }),
}) as unknown as IDBDatabase

it('reports a connection closed by another tab with the store’s own code', async () => {
  const store = new SnapshotStore(closedDb())
  await expect(store.read()).rejects.toMatchObject({ code: 'closed' })
  await expect(store.update({ revision: 0, epoch: 0 }, data => data)).rejects.toMatchObject({ code: 'closed' })
})
it('reports use after close() without opening a transaction', async () => {
  const db = closedDb()
  const store = new SnapshotStore(db)
  store.close()
  await expect(store.read()).rejects.toMatchObject({ code: 'closed' })
  expect(db.transaction).not.toHaveBeenCalled()
})
it('initialize rejects instead of throwing on data it cannot copy', async () => {
  const store = new SnapshotStore(closedDb())
  const uncloneable = { ...snapshot(), settings: { fn: () => 1 } } as unknown as Snapshot
  let result: Promise<unknown> | undefined
  expect(() => { result = store.initialize(uncloneable) }).not.toThrow()
  await expect(result).rejects.toMatchObject({ name: 'DataCloneError' })
})
