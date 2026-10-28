import type { DataSource } from '../adapters/DataSource'

/** Serialize materialization; a rule edit during a pass needs a subsequent pass. */
export function createRecurringSync(source: Pick<DataSource, 'syncRecurring'>) {
  let tail = Promise.resolve()
  let revision = 0
  let syncedRevision = -1
  let syncedDay: string | null = null

  return {
    invalidate: () => { revision += 1 },
    ensure: (day: string) => {
      const requestedRevision = revision
      const pass = tail.then(async () => {
        if (syncedDay === day && syncedRevision === requestedRevision) return
        await source.syncRecurring(day)
        syncedDay = day
        syncedRevision = requestedRevision
      })
      // The caller reports a rejection; keep the queue usable for a later retry.
      tail = pass.catch(() => {})
      return pass
    },
  }
}
