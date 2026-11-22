import type { Snapshot } from '../../../domain/sync'

/**
 * State for the isolated IndexedDB snapshot store. Not used by the app yet.
 *
 * - `active`: the current complete Snapshot. Every update increments `revision`.
 * - `previous`: the generation kept by the last checkpoint (null before any).
 * - `control.epoch`: equals `active.epoch`; a checkpoint increments it.
 * - `control.syncHeld`: set by a checkpoint and kept by ordinary edits. After a
 *   checkpoint (`epoch > 0`) a predecessor is required; a released hold is valid.
 *
 * Error codes: `absent` no state yet; `exists` initialize on existing state;
 * `corrupt` malformed or inconsistent records; `schema` unsupported database or
 * record version; `stale` expected revision/epoch no longer current; `blocked`
 * another connection prevents opening; `closed` the connection was closed (by
 * `close()` or another tab upgrading/deleting the database), reopen to continue.
 */
export type StoreErrorCode = 'absent' | 'corrupt' | 'schema' | 'exists' | 'stale' | 'blocked' | 'closed'
export class SnapshotStoreError extends Error {
  readonly code: StoreErrorCode
  constructor(code: StoreErrorCode, message: string) { super(message); this.name = 'SnapshotStoreError'; this.code = code }
}
export interface Generation { snapshot: Snapshot; revision: number; epoch: number }
export interface StoreState { active: Generation; previous: Generation | null; control: { epoch: number; syncHeld: boolean } }
export interface ExpectedGeneration { revision: number; epoch: number }
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const counter = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(name => Object.hasOwn(v, name))

/** Storage-container validation only. Backup/record validation belongs at the caller boundary. */
export function snapshotContainer(v: unknown): v is Snapshot {
  if (!object(v) || !keys(v, ['tasks', 'tags', 'rules', 'settings', 'meta'])) return false
  if (![v.tasks, v.tags, v.rules].every(Array.isArray) || (v.settings !== null && !object(v.settings))) return false
  const meta = v.meta
  if (!object(meta) || !keys(meta, ['updated', 'deleted', 'settingsUpdated'])) return false
  if (meta.settingsUpdated !== null && typeof meta.settingsUpdated !== 'string') return false
  return [meta.updated, meta.deleted].every(maps => object(maps) && keys(maps, ['tasks', 'tags', 'rules']) &&
    Object.values(maps).every(map => object(map) && Object.values(map).every(stamp => typeof stamp === 'string')))
}
const generation = (v: unknown): v is Generation => object(v) && keys(v, ['snapshot', 'revision', 'epoch']) &&
  snapshotContainer(v.snapshot) && counter(v.revision) && counter(v.epoch)

export function assertState(value: unknown): asserts value is StoreState {
  if (!object(value) || !generation(value.active) || (value.previous !== null && !generation(value.previous)) ||
      !object(value.control) || !keys(value.control, ['epoch', 'syncHeld']) || !counter(value.control.epoch) || typeof value.control.syncHeld !== 'boolean') {
    throw new SnapshotStoreError('corrupt', 'Invalid snapshot storage envelope')
  }
  const { active, previous, control } = value
  if (active.epoch !== control.epoch || (previous !== null && (previous.revision >= active.revision || previous.epoch >= active.epoch)) ||
      (active.epoch > 0 && previous === null)) {
    throw new SnapshotStoreError('corrupt', 'Inconsistent snapshot generation or sync hold')
  }
}

export function nextState(current: StoreState, expected: ExpectedGeneration, transform: (snapshot: Snapshot) => Snapshot,
  checkpoint = false): StoreState {
  if (current.active.epoch !== expected.epoch || current.active.revision !== expected.revision) {
    throw new SnapshotStoreError('stale', 'Data changed; refresh before retrying the operation')
  }
  const snapshot = transform(structuredClone(current.active.snapshot))
  const epoch = current.active.epoch + (checkpoint ? 1 : 0)
  const next: StoreState = {
    active: { snapshot, revision: current.active.revision + 1, epoch },
    previous: checkpoint ? current.active : current.previous,
    control: { epoch, syncHeld: current.control.syncHeld || checkpoint },
  }
  assertState(next) // Also rejects promises/invalid outputs and counter overflow.
  return structuredClone(next)
}
