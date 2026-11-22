import type { Snapshot } from '../../../domain/sync'
import { assertState, nextState, SnapshotStoreError, type ExpectedGeneration, type StoreState } from './state'

const STORE = 'snapshots'
const KEYS = ['active', 'previous', 'control'] as const
const VERSION = 1

/**
 * Isolated IndexedDB snapshot store (database version 1, object store `snapshots`
 * holding `active`, `previous` and `control` records). Explicitly opened; not
 * imported by production code. `initialize` refuses existing state and `read`
 * never initializes. `update` checks the expected revision/epoch inside its
 * readwrite transaction and is never retried. All records are written in one
 * transaction; results resolve only on completion and any abort rejects. The
 * caller validates untrusted snapshot content; this checks storage containers.
 */
export function openSnapshotStore(name: string, factory: IDBFactory = indexedDB): Promise<SnapshotStore> {
  return new Promise((resolve, reject) => {
    let rejected = false
    const request = factory.open(name, VERSION)
    request.onupgradeneeded = event => {
      if (event.oldVersion !== 0) { request.transaction?.abort(); return }
      request.result.createObjectStore(STORE)
    }
    request.onblocked = () => { rejected = true; reject(new SnapshotStoreError('blocked', 'Close other database connections and retry')) }
    request.onerror = () => reject(request.error?.name === 'VersionError'
      ? new SnapshotStoreError('schema', 'Unsupported database schema') : request.error)
    request.onsuccess = () => {
      const db = request.result
      if (rejected) { db.close(); return }
      if (db.objectStoreNames.length !== 1 || !db.objectStoreNames.contains(STORE)) {
        db.close(); reject(new SnapshotStoreError('corrupt', 'Missing snapshot store')); return
      }
      const store = new SnapshotStore(db)
      db.onversionchange = () => store.close()
      resolve(store)
    }
  })
}

export class SnapshotStore {
  private readonly db: IDBDatabase
  private closed = false
  constructor(db: IDBDatabase) { this.db = db; db.addEventListener('close', () => { this.closed = true }) }
  close(): void { this.closed = true; this.db.close() }

  private run(mode: IDBTransactionMode, operation: (state: StoreState | null) => StoreState): Promise<StoreState> {
    return new Promise((resolve, reject) => {
      const closed = () => reject(new SnapshotStoreError('closed', 'Database connection closed; reopen the store'))
      if (this.closed) { closed(); return }
      let tx: IDBTransaction
      try { tx = this.db.transaction(STORE, mode) }
      catch (cause) { if ((cause as Error)?.name === 'InvalidStateError') closed(); else reject(cause); return }
      let result: StoreState
      let failure: unknown
      tx.oncomplete = () => resolve(structuredClone(result))
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Snapshot transaction aborted'))
      // Request errors abort by default and reach onabort via tx.error. Never preventDefault or resolve on request success.
      const store = tx.objectStore(STORE)
      const keyRequest = store.getAllKeys()
      keyRequest.onsuccess = () => {
        if (keyRequest.result.some(key => !KEYS.includes(key as typeof KEYS[number]))) {
          failure = new SnapshotStoreError('corrupt', 'Unexpected snapshot record')
          tx.abort()
        }
      }
      const values: unknown[] = []
      let remaining = KEYS.length
      KEYS.forEach((key, index) => {
        const request = store.get(key)
        request.onsuccess = () => {
          values[index] = request.result
          if (--remaining) return
          try {
            let state: StoreState | null = null
            if (!values.every(value => value === undefined)) {
              if (values.some(value => value === undefined)) throw new SnapshotStoreError('corrupt', 'Incomplete snapshot state')
              const decoded = values.map(value => {
                if (!value || typeof value !== 'object' || !('version' in value) || !('data' in value)) {
                  throw new SnapshotStoreError('corrupt', 'Malformed storage record')
                }
                if (value.version !== VERSION) throw new SnapshotStoreError('schema', 'Unsupported record schema')
                return value.data
              })
              const candidate = { active: decoded[0], previous: decoded[1], control: decoded[2] }
              assertState(candidate)
              state = candidate
            }
            result = operation(state)
            assertState(result)
            if (mode === 'readwrite') for (const key of KEYS) store.put({ version: VERSION, data: result[key] }, key)
          } catch (cause) { failure = cause; tx.abort() }
        }
      })
    })
  }

  initialize(snapshot: Snapshot): Promise<StoreState> {
    let supplied: Snapshot
    try { supplied = structuredClone(snapshot) } catch (cause) { return Promise.reject(cause) }
    return this.run('readwrite', current => {
      if (current !== null) throw new SnapshotStoreError('exists', 'Snapshot state already exists')
      return { active: { snapshot: supplied, revision: 0, epoch: 0 }, previous: null, control: { epoch: 0, syncHeld: false } }
    })
  }

  read(): Promise<StoreState> {
    return this.run('readonly', state => {
      if (state === null) throw new SnapshotStoreError('absent', 'Snapshot state has not been initialized')
      return state
    })
  }

  /** Synchronous transform only. Expectations are checked inside the write transaction; never auto-retried. */
  update(expected: ExpectedGeneration, transform: (snapshot: Snapshot) => Snapshot, checkpoint = false): Promise<StoreState> {
    const fence = { ...expected }
    return this.run('readwrite', state => {
      if (state === null) throw new SnapshotStoreError('absent', 'Snapshot state has not been initialized')
      return nextState(state, fence, transform, checkpoint)
    })
  }
}
