import type { Collection, Snapshot, SyncMeta } from '../../domain/sync'

/**
 * Everything read from the sync folder is untrusted (other devices, cloud
 * glitches, hand edits). A file is used only if its shape and timestamps make
 * sense; individual malformed records are dropped rather than imported.
 */

/** Stamps further ahead than this mean a wrong clock (or tampering). */
export const MAX_CLOCK_AHEAD_MS = 24 * 60 * 60 * 1000

type Rec = Record<string, unknown>
const isObject = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isStringOrNull = (v: unknown) => v === null || isString(v)
const isStringArray = (v: unknown) => Array.isArray(v) && v.every(isString)

const isIntArray = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(Number.isInteger)
const isMonthly = (v: unknown) =>
  v === undefined ||
  (isObject(v) &&
    ((v.type === 'date' && isIntArray(v.days)) ||
      (v.type === 'weekday' && Number.isInteger(v.nth) && Number.isInteger(v.weekday))))

const isRepeat = (v: unknown) =>
  isObject(v) &&
  isMonthly(v.monthly) &&
  ['day', 'week', 'month', 'year'].includes(v.unit as string) &&
  Number.isInteger(v.every) &&
  (v.every as number) >= 1 &&
  isString(v.startDate) &&
  isStringOrNull(v.endDate ?? null)

const RECORD_CHECKS: Record<Collection, (r: Rec) => boolean> = {
  tasks: (r) =>
    isString(r.title) &&
    ['todo', 'doing', 'done', 'canceled'].includes(r.status as string) &&
    isStringOrNull(r.dayDate) &&
    typeof r.rondeled === 'boolean' &&
    (r.bucket === null || r.bucket === 'bucket-list') &&
    typeof r.position === 'number' &&
    typeof r.rondelCount === 'number' &&
    isStringArray(r.tagIds) &&
    isString(r.note) &&
    isString(r.createdAt),
  tags: (r) => isString(r.name) && isString(r.color),
  rules: (r) =>
    isString(r.title) &&
    ['weekly-start', 'monthly-start', 'weekly-on', 'monthly-on', 'repeat'].includes(r.kind as string) &&
    (r.kind !== 'repeat' || isRepeat(r.repeat)) &&
    (r.flagged === undefined || typeof r.flagged === 'boolean') &&
    isStringArray(r.tagIds) &&
    isString(r.createdAt),
}

const isTime = (v: unknown) => isString(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
const isTimeZone = (v: unknown) => {
  if (!isString(v)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v })
    return true
  } catch {
    return false
  }
}

const SETTING_CHECKS: Record<string, (v: unknown) => boolean> = {
  weekStartDay: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6,
  dayStartTime: isTime,
  endOfDayTime: isTime,
  timezone: isTimeZone,
}

/** Settings are all-or-nothing: one bad field could break dates everywhere. */
function settingsOk(settings: Rec): boolean {
  return Object.entries(settings).every(([key, value]) => SETTING_CHECKS[key]?.(value) ?? false)
}

export type Validated =
  | { ok: true; snapshot: Snapshot; droppedRecords: number }
  | { ok: false; reason: string }

function stampsOk(map: unknown, latestAllowed: number): map is Record<string, string> {
  if (!isObject(map)) return false
  return Object.values(map).every((at) => isString(at) && !Number.isNaN(Date.parse(at)) && Date.parse(at) <= latestAllowed)
}

export function validateSnapshot(data: unknown, now = Date.now()): Validated {
  if (!isObject(data) || !isObject(data.meta)) return { ok: false, reason: 'missing data' }
  const meta = data.meta
  const latestAllowed = now + MAX_CLOCK_AHEAD_MS
  if (!isObject(meta.updated) || !isObject(meta.deleted)) return { ok: false, reason: 'missing change history' }

  const collections: Collection[] = ['tasks', 'tags', 'rules']
  for (const c of collections) {
    if (!Array.isArray(data[c])) return { ok: false, reason: `missing ${c}` }
    if (!stampsOk(meta.updated[c] ?? {}, latestAllowed) || !stampsOk(meta.deleted[c] ?? {}, latestAllowed)) {
      return { ok: false, reason: 'timestamps from the future (wrong clock?)' }
    }
  }
  const settingsUpdated = meta.settingsUpdated ?? null
  if (settingsUpdated !== null && !stampsOk({ s: settingsUpdated }, latestAllowed)) {
    return { ok: false, reason: 'timestamps from the future (wrong clock?)' }
  }

  let droppedRecords = 0
  const clean = {} as Record<Collection, Rec[]>
  const updated = {} as SyncMeta['updated']
  for (const c of collections) {
    clean[c] = (data[c] as unknown[]).filter((r): r is Rec => {
      const valid = isObject(r) && isString(r.id) && RECORD_CHECKS[c](r)
      if (!valid) droppedRecords++
      return valid
    })
    const kept = new Set(clean[c].map((r) => r.id as string))
    updated[c] = Object.fromEntries(Object.entries((meta.updated[c] ?? {}) as Record<string, string>).filter(([id]) => kept.has(id)))
  }

  const settingsValid = isObject(data.settings) && settingsOk(data.settings)
  if (isObject(data.settings) && !settingsValid) droppedRecords++
  const settings = settingsValid ? (data.settings as Rec) : null
  return {
    ok: true,
    droppedRecords,
    snapshot: {
      tasks: clean.tasks as unknown as Snapshot['tasks'],
      tags: clean.tags as unknown as Snapshot['tags'],
      rules: clean.rules as unknown as Snapshot['rules'],
      settings: settings as Snapshot['settings'],
      meta: {
        updated,
        deleted: {
          tasks: (meta.deleted.tasks ?? {}) as Record<string, string>,
          tags: (meta.deleted.tags ?? {}) as Record<string, string>,
          rules: (meta.deleted.rules ?? {}) as Record<string, string>,
        },
        // Without valid settings there's nothing for this stamp to win with.
        settingsUpdated: settings ? (settingsUpdated as string | null) : null,
      },
    },
  }
}
