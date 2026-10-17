import { validateSnapshot } from './validate'

const NOW = Date.parse('2026-10-01T10:00:00Z')

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
})
