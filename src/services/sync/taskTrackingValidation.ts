type RecordValue = Record<string, unknown>

const isTimestamp = (value: unknown): boolean =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))

const isOptionalTimestamp = (value: unknown): boolean => value == null || isTimestamp(value)
const isBucket = (value: unknown): boolean => value === null || value === 'bucket-list'
const isDate = (value: unknown): boolean => {
  if (value === null) return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isRondel(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as RecordValue
  return typeof record.id === 'string' && record.id.length > 0 &&
    isTimestamp(record.occurredAt) &&
    isDate(record.fromDate) && isDate(record.toDate) &&
    typeof record.fromRondeled === 'boolean' && typeof record.toRondeled === 'boolean' &&
    isBucket(record.fromBucket) && isBucket(record.toBucket) &&
    ['todo', 'doing', 'done', 'canceled'].includes(record.status as string)
}

function isBucketEvent(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as RecordValue
  return typeof record.id === 'string' && record.id.length > 0 && isTimestamp(record.occurredAt)
    && (record.kind === 'added' || record.kind === 'scheduled')
}

/** Older device files omit these fields; supplied observations must be valid. */
export function taskTrackingValid(record: RecordValue): boolean {
  const count = record.doingRondelCount
  return (count == null || (Number.isInteger(count) && (count as number) >= 0 && (count as number) <= (record.rondelCount as number))) &&
    isOptionalTimestamp(record.startedAt) && isOptionalTimestamp(record.canceledAt) &&
    (record.bucketListOrigin == null || typeof record.bucketListOrigin === 'boolean') &&
    (record.rondelHistory === undefined || (Array.isArray(record.rondelHistory) && record.rondelHistory.every(isRondel))) &&
    (record.bucketHistory === undefined || (Array.isArray(record.bucketHistory) && record.bucketHistory.every(isBucketEvent)))
}
