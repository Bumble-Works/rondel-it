import type { RecurringRule, Tag, Task, UserSetting } from '../../domain/types'
import { EMPTY_META, type Collection, type Snapshot, type SyncMeta } from '../../domain/sync'

/**
 * Local persistence (the web view's localStorage). Every write records when
 * each record changed and leaves a marker for deleted ones, so sync can merge
 * devices without a missing record ever meaning "delete".
 */
const KEYS = {
  tasks: 'rondel.v6.tasks',
  tags: 'rondel.v6.tags',
  rules: 'rondel.v6.rules',
  settings: 'rondel.v6.settings',
  meta: 'rondel.v6.meta',
} as const

function latestStamp(meta: SyncMeta): string {
  let latest = meta.settingsUpdated ?? ''
  for (const map of [...Object.values(meta.updated), ...Object.values(meta.deleted)]) {
    for (const at of Object.values(map)) if (at > latest) latest = at
  }
  return latest
}

/**
 * A change time that's always later than any change this device has seen,
 * even if its clock is behind another device's, so a new edit always wins.
 */
function nextStamp(meta: SyncMeta): string {
  const now = Date.now()
  const seen = Date.parse(latestStamp(meta))
  return new Date(Number.isNaN(seen) ? now : Math.max(now, seen + 1)).toISOString()
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

// Parsed data is kept until the stored text changes, so reads don't re-parse
// everything. It's frozen: code must copy records to change them, never edit
// the cached ones in place.
const parsed = new Map<string, { raw: string; value: unknown }>()

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  const cached = parsed.get(key)
  if (cached?.raw === raw) return cached.value as T
  try {
    const value = deepFreeze(JSON.parse(raw) as T)
    parsed.set(key, { raw, value })
    return value
  } catch (e) {
    // Don't silently wipe data: surface it, and leave the stored value untouched.
    throw new Error(`Saved data for "${key}" is unreadable`, { cause: e })
  }
}

export function readMeta(): SyncMeta {
  const meta = readJson<Partial<SyncMeta>>(KEYS.meta, {})
  return {
    updated: { ...EMPTY_META.updated, ...meta.updated },
    deleted: { ...EMPTY_META.deleted, ...meta.deleted },
    settingsUpdated: meta.settingsUpdated ?? EMPTY_META.settingsUpdated,
  }
}

function writeMeta(meta: SyncMeta) {
  localStorage.setItem(KEYS.meta, JSON.stringify(meta))
}

/** A fresh array (safe to push/splice) of frozen records. */
export function readRaw<T>(collection: Collection): T[] {
  return [...readJson<T[]>(KEYS[collection], [])]
}

/**
 * Saves a collection, stamping changed records and marking removed ones as
 * deleted. `normalize` is how records are read, so filling in fields added by
 * newer versions doesn't count as an edit.
 */
export function writeCollection<T extends { id: string }>(
  collection: Collection,
  next: T[],
  normalize: (record: T) => T = (r) => r,
) {
  const before = new Map(readRaw<T>(collection).map((r) => [r.id, JSON.stringify(normalize(r))]))
  const meta = readMeta()
  const updated = { ...meta.updated[collection] }
  const deleted = { ...meta.deleted[collection] }
  const now = nextStamp(meta)

  for (const record of next) {
    if (before.get(record.id) !== JSON.stringify(record)) updated[record.id] = now
    delete deleted[record.id]
  }
  const nextIds = new Set(next.map((r) => r.id))
  for (const id of before.keys()) {
    if (!nextIds.has(id)) {
      deleted[id] = now
      delete updated[id]
    }
  }

  localStorage.setItem(KEYS[collection], JSON.stringify(next))
  writeMeta({ ...meta, updated: { ...meta.updated, [collection]: updated }, deleted: { ...meta.deleted, [collection]: deleted } })
}

export function readSettingsRaw(): Partial<UserSetting> | null {
  return readJson<Partial<UserSetting> | null>(KEYS.settings, null)
}

export function writeSettings(settings: UserSetting) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
  const meta = readMeta()
  writeMeta({ ...meta, settingsUpdated: nextStamp(meta) })
}

/** Everything sync needs, as stored. */
export function exportSnapshot(): Snapshot {
  return {
    tasks: readRaw<Task>('tasks'),
    tags: readRaw<Tag>('tags'),
    rules: readRaw<RecurringRule>('rules'),
    settings: readSettingsRaw(),
    meta: readMeta(),
  }
}

/** Replaces local data with a merged snapshot, keeping its timestamps as-is. */
export function importSnapshot(snapshot: Snapshot) {
  localStorage.setItem(KEYS.tasks, JSON.stringify(snapshot.tasks))
  localStorage.setItem(KEYS.tags, JSON.stringify(snapshot.tags))
  localStorage.setItem(KEYS.rules, JSON.stringify(snapshot.rules))
  if (snapshot.settings) localStorage.setItem(KEYS.settings, JSON.stringify(snapshot.settings))
  writeMeta(snapshot.meta)
}
