import { EMPTY_META, mergeSnapshots, type Snapshot } from './sync'
import type { Tag } from './types'

function device(tags: Array<[Tag, string?]>, deleted: Record<string, string> = {}): Snapshot {
  return {
    tasks: [],
    tags: tags.map(([tag]) => tag),
    rules: [],
    settings: null,
    meta: {
      ...EMPTY_META,
      updated: { ...EMPTY_META.updated, tags: Object.fromEntries(tags.filter(([, at]) => at).map(([t, at]) => [t.id, at!])) },
      deleted: { ...EMPTY_META.deleted, tags: deleted },
    },
  }
}

const tag = (id: string, name: string): Tag => ({ id, name, color: '#000' })

describe('mergeSnapshots', () => {
  it('keeps records from every device', () => {
    const merged = mergeSnapshots([device([[tag('a', 'A'), 't1']]), device([[tag('b', 'B'), 't1']])])
    expect(merged.tags.map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  it('takes the most recent edit of the same record', () => {
    const merged = mergeSnapshots([
      device([[tag('a', 'old'), '2026-10-01T10:00:00Z']]),
      device([[tag('a', 'new'), '2026-10-02T10:00:00Z']]),
    ])
    expect(merged.tags).toEqual([tag('a', 'new')])
    expect(merged.meta.updated.tags.a).toBe('2026-10-02T10:00:00Z')
  })

  it('never deletes a record just because another device lacks it', () => {
    const merged = mergeSnapshots([device([[tag('a', 'A'), 't1']]), device([])])
    expect(merged.tags).toHaveLength(1)
  })

  it('applies an explicit deletion made after the last edit', () => {
    const merged = mergeSnapshots([
      device([[tag('a', 'A'), '2026-10-01T10:00:00Z']]),
      device([], { a: '2026-10-02T10:00:00Z' }),
    ])
    expect(merged.tags).toHaveLength(0)
    expect(merged.meta.deleted.tags.a).toBe('2026-10-02T10:00:00Z')
  })

  it('keeps a record edited after it was deleted elsewhere', () => {
    const merged = mergeSnapshots([
      device([[tag('a', 'edited'), '2026-10-03T10:00:00Z']]),
      device([], { a: '2026-10-02T10:00:00Z' }),
    ])
    expect(merged.tags).toEqual([tag('a', 'edited')])
    expect(merged.meta.deleted.tags.a).toBeUndefined()
  })

  it('lets any tracked edit win over data saved before tracking existed', () => {
    const merged = mergeSnapshots([device([[tag('a', 'legacy')]]), device([[tag('a', 'tracked'), 't1']])])
    expect(merged.tags).toEqual([tag('a', 'tracked')])
  })

  it('takes the most recently changed settings', () => {
    const older = { ...device([]), settings: { weekStartDay: 0 }, meta: { ...EMPTY_META, settingsUpdated: 't1' } }
    const newer = { ...device([]), settings: { weekStartDay: 1 }, meta: { ...EMPTY_META, settingsUpdated: 't2' } }
    expect(mergeSnapshots([newer, older]).settings).toEqual({ weekStartDay: 1 })
  })
})
