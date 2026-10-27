import { validateSnapshot } from './validate'

const NOW = Date.parse('2026-10-01T10:00:00Z')

function savedTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task', title: 'Ship', status: 'todo', dayDate: '2026-10-01', rondeled: false,
    bucket: null, position: 0, rondelCount: 2, tagIds: [], note: '', createdAt: '2026-09-28T09:00:00Z',
    ...overrides,
  }
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    tasks: [],
    tags: [{ id: 'a', name: 'work', color: '#000' }],
    rules: [],
    settings: null,
    meta: {
      updated: { tasks: {}, tags: { a: '2026-10-01T09:00:00.000Z' }, rules: {} },
      deleted: { tasks: {}, tags: {}, rules: {} },
      settingsUpdated: null,
    },
    ...overrides,
  }
}

describe('validateSnapshot', () => {
  it('keeps missing legacy observations unknown without changing edit stamps', () => {
    const old = snapshot({ tasks: [savedTask(), savedTask({ id: 'bucket', bucket: 'bucket-list', dayDate: null, rondelCount: 0 })] })
    old.meta.updated.tasks = { task: '2026-10-01T09:00:00.000Z' }
    const result = validateSnapshot(old, NOW)
    expect(result.ok && result.snapshot.tasks[0]).toMatchObject({
      doingRondelCount: null, startedAt: null, bucketListOrigin: null, canceledAt: null, rondelHistory: [],
    })
    expect(result.ok && result.snapshot.tasks[1]).toMatchObject({ doingRondelCount: 0, bucketListOrigin: true })
    expect(result.ok && result.snapshot.meta.updated.tasks).toEqual(old.meta.updated.tasks)
  })

  it('accepts reporting observations and rejects malformed ones', () => {
    const event = {
      id: 'move', occurredAt: '2026-10-01T09:00:00Z', fromDate: '2026-10-01', toDate: null,
      fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: 'bucket-list', status: 'doing',
    }
    const observed = savedTask({
      doingRondelCount: 1, startedAt: '2026-09-30T09:00:00Z', canceledAt: null,
      bucketListOrigin: false, rondelHistory: [event], bucketHistory: [],
    })
    const valid = validateSnapshot(snapshot({ tasks: [observed] }), NOW)
    expect(valid.ok && valid.snapshot.tasks[0]).toEqual(observed)

    const malformed = [
      { doingRondelCount: -1 }, { doingRondelCount: 0.5 }, { doingRondelCount: 3 },
      { doingRondelCount: '1' }, { startedAt: 'yesterday' }, { canceledAt: 2 },
      { bucketListOrigin: 'yes' }, { rondelHistory: null }, { rondelHistory: [{}] },
      { rondelHistory: [{ ...event, toDate: '2026-02-30' }] },
      { rondelHistory: [{ ...event, status: 'waiting' }] },
      { rondelHistory: [{ ...event, occurredAt: 'bad time' }] },
      { bucketHistory: null }, { bucketHistory: [{}] },
      { bucketHistory: [{ id: 'bucket', kind: 'deleted', occurredAt: '2026-10-01T09:00:00Z' }] },
      { bucketHistory: [{ id: 'bucket', kind: 'added', occurredAt: 'yesterday' }] },
    ]
    for (const fields of malformed) {
      const result = validateSnapshot(snapshot({ tasks: [{ ...observed, ...fields }] }), NOW)
      expect(result.ok && result.droppedRecords).toBe(1)
      expect(result.ok && result.snapshot.tasks).toEqual([])
    }
  })

  it('accepts a well-formed snapshot', () => {
    const result = validateSnapshot(snapshot(), NOW)
    expect(result.ok && result.snapshot.tags).toEqual([{ id: 'a', name: 'work', color: '#000' }])
  })

  it('rejects a file whose clock is far in the future, so it can never win every edit', () => {
    const future = snapshot()
    future.meta.updated.tags.a = '2027-01-01T00:00:00.000Z'
    expect(validateSnapshot(future, NOW)).toEqual({ ok: false, reason: 'timestamps from the future (wrong clock?)' })

    const garbage = snapshot()
    garbage.meta.deleted.tags = { x: 'zzz' } as never
    expect(validateSnapshot(garbage, NOW).ok).toBe(false)
  })

  it('drops malformed records instead of importing them', () => {
    const result = validateSnapshot(
      snapshot({
        rules: [{ id: 'r', title: 'No createdAt', kind: 'weekly-on', tagIds: [] }],
        tags: [{ id: 'a', name: 'work', color: '#000' }, { name: 'no id', color: '#000' }],
      }),
      NOW,
    )
    expect(result.ok && result.droppedRecords).toBe(2)
    expect(result.ok && result.snapshot.rules).toEqual([])
  })

  it('rejects files missing their change history', () => {
    expect(validateSnapshot({ tasks: [], tags: [], rules: [], meta: {} }, NOW).ok).toBe(false)
  })

  it('ignores settings with any invalid field, keeping the rest of the file', () => {
    const bad = snapshot({ settings: { weekStartDay: 'Monday', endOfDayTime: '17:00' } })
    bad.meta.settingsUpdated = '2026-10-01T09:30:00.000Z' as never
    const result = validateSnapshot(bad, NOW)
    expect(result.ok && result.snapshot.settings).toBeNull()
    expect(result.ok && result.snapshot.meta.settingsUpdated).toBeNull()
    expect(result.ok && result.snapshot.tags).toHaveLength(1)

    for (const settings of [{ endOfDayTime: '25:00' }, { timezone: 'Mars/Olympus' }, { surprise: true }]) {
      const r = validateSnapshot(snapshot({ settings }), NOW)
      expect(r.ok && r.snapshot.settings).toBeNull()
    }

    const good = validateSnapshot(snapshot({ settings: { weekStartDay: 0, dayStartTime: '08:30', timezone: 'Asia/Tokyo' } }), NOW)
    expect(good.ok && good.snapshot.settings).toEqual({ weekStartDay: 0, dayStartTime: '08:30', timezone: 'Asia/Tokyo' })
  })

  it('accepts custom repeat rules and drops malformed ones', () => {
    const good = { id: 'r1', title: 'Gym', kind: 'repeat', tagIds: [], createdAt: 'x', repeat: { unit: 'week', every: 1, weekdays: [1], startDate: '2026-10-19', endDate: null } }
    const bad = { id: 'r2', title: 'Broken', kind: 'repeat', tagIds: [], createdAt: 'x', repeat: { unit: 'fortnight', every: 0 } }
    const badMonth = { ...good, id: 'r3', repeat: { ...good.repeat, unit: 'month', monthly: { type: 'date', day: 5 } } }
    const badWeek = { ...good, id: 'r4', repeat: { ...good.repeat, weekdays: 'Mon' } }
    // Out of range: no fifth week, no weekday 7, no 32nd.
    const month = (monthly: object) => ({ ...good.repeat, unit: 'month', monthly })
    const badNth = { ...good, id: 'r5', repeat: month({ type: 'weekday', nth: 5, weekday: 1 }) }
    const badWeekday = { ...good, id: 'r6', repeat: { ...good.repeat, weekdays: [7] } }
    const badDate = { ...good, id: 'r7', repeat: month({ type: 'date', days: [32] }) }
    const lastFriday = { ...good, id: 'r8', repeat: month({ type: 'weekday', nth: -1, weekday: 5 }) }
    const result = validateSnapshot(snapshot({ rules: [good, bad, badMonth, badWeek, badNth, badWeekday, badDate, lastFriday] }), NOW)
    expect(result.ok && result.snapshot.rules.map((r) => r.id)).toEqual(['r1', 'r8'])
  })
})
