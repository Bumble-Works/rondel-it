import type { RecurringRule, Tag, Task, UserSetting } from './types'

export type Collection = 'tasks' | 'tags' | 'rules'
const COLLECTIONS: Collection[] = ['tasks', 'tags', 'rules']

/** When each record last changed, and when deleted ones were deleted (ISO times). */
export interface SyncMeta {
  updated: Record<Collection, Record<string, string>>
  deleted: Record<Collection, Record<string, string>>
  settingsUpdated: string | null
}

export const EMPTY_META: SyncMeta = {
  updated: { tasks: {}, tags: {}, rules: {} },
  deleted: { tasks: {}, tags: {}, rules: {} },
  settingsUpdated: null,
}

export interface Snapshot {
  tasks: Task[]
  tags: Tag[]
  rules: RecurringRule[]
  settings: Partial<UserSetting> | null
  meta: SyncMeta
}

/** Records saved before change tracking count as oldest, so any real edit wins. */
const NEVER = ''

const later = (a: string | undefined, b: string | undefined) => ((a ?? NEVER) >= (b ?? NEVER) ? a : b)

function mergeCollection<T extends { id: string }>(
  snapshots: Snapshot[],
  collection: Collection,
): { records: T[]; updated: Record<string, string>; deleted: Record<string, string> } {
  const best = new Map<string, { record: T; at: string }>()
  const deleted: Record<string, string> = {}

  for (const s of snapshots) {
    const updatedAt = s.meta.updated[collection] ?? {}
    for (const record of s[collection] as unknown as T[]) {
      const at = updatedAt[record.id] ?? NEVER
      const current = best.get(record.id)
      if (!current || at > current.at) best.set(record.id, { record, at })
    }
    for (const [id, at] of Object.entries(s.meta.deleted[collection] ?? {})) {
      deleted[id] = later(deleted[id], at) ?? at
    }
  }

  const records: T[] = []
  const updated: Record<string, string> = {}
  for (const [id, { record, at }] of best) {
    // A deletion only wins over edits made before it; a later edit revives it.
    if (deleted[id] !== undefined && deleted[id] >= at) continue
    delete deleted[id]
    records.push(record)
    if (at !== NEVER) updated[id] = at
  }
  return { records, updated, deleted }
}

/**
 * Merges devices' snapshots: per record, the most recent edit wins; a record
 * is only removed by an explicit deletion marker, never by being missing.
 */
export function mergeSnapshots(snapshots: Snapshot[]): Snapshot {
  const merged = Object.fromEntries(COLLECTIONS.map((c) => [c, mergeCollection(snapshots, c)])) as Record<
    Collection,
    ReturnType<typeof mergeCollection>
  >

  let settings: Snapshot['settings'] = null
  let settingsUpdated: string | null = null
  for (const s of snapshots) {
    if (!s.settings) continue
    if (settings === null || (s.meta.settingsUpdated ?? NEVER) > (settingsUpdated ?? NEVER)) {
      settings = s.settings
      settingsUpdated = s.meta.settingsUpdated
    }
  }

  return {
    tasks: merged.tasks.records as Task[],
    tags: merged.tags.records as Tag[],
    rules: merged.rules.records as RecurringRule[],
    settings,
    meta: {
      updated: { tasks: merged.tasks.updated, tags: merged.tags.updated, rules: merged.rules.updated },
      deleted: { tasks: merged.tasks.deleted, tags: merged.tags.deleted, rules: merged.rules.deleted },
      settingsUpdated,
    },
  }
}
