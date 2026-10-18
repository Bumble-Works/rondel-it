import { exportSnapshot, importSnapshot, readMeta, readRaw, writeCollection } from './localStore'

describe('localStore change tracking', () => {
  it('stamps only records that changed and marks removed ones as deleted', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
    writeCollection('tags', [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])

    vi.setSystemTime(new Date('2026-10-02T10:00:00Z'))
    writeCollection('tags', [{ id: 'a', name: 'A2' }])

    const meta = readMeta()
    expect(meta.updated.tags).toEqual({ a: '2026-10-02T10:00:00.000Z' })
    expect(meta.deleted.tags).toEqual({ b: '2026-10-02T10:00:00.000Z' })
  })

  it("doesn't count filling in newer fields as an edit", () => {
    localStorage.setItem('rondel.v6.tags', JSON.stringify([{ id: 'a', name: 'A' }]))
    const withDefault = (r: { id: string; name: string; color?: string }) => ({ color: '#000', ...r })
    writeCollection('tags', [withDefault({ id: 'a', name: 'A' })], withDefault)
    expect(readMeta().updated.tags).toEqual({})
  })

  it('round-trips a snapshot without re-stamping it', () => {
    writeCollection('tags', [{ id: 'a', name: 'A' }])
    const snapshot = exportSnapshot()
    localStorage.clear()
    importSnapshot(snapshot)
    expect(exportSnapshot()).toEqual(snapshot)
  })

  it('surfaces unreadable saved data instead of treating it as empty', () => {
    localStorage.setItem('rondel.v6.tags', '{not json')
    expect(() => exportSnapshot()).toThrow('unreadable')
  })

  it('reuses parsed data until it changes, and hands out frozen records', () => {
    writeCollection('tags', [{ id: 'a', name: 'A' }])
    readRaw('tags') // first read after the save parses once
    const parse = vi.spyOn(JSON, 'parse')
    readRaw('tags')
    readRaw('tags')
    expect(parse).not.toHaveBeenCalled()
    parse.mockRestore()

    const [tag] = readRaw<{ id: string; name: string }>('tags')
    expect(() => {
      tag.name = 'edited in place'
    }).toThrow(TypeError)

    writeCollection('tags', [{ id: 'a', name: 'B' }])
    expect(readRaw<{ name: string }>('tags')[0].name).toBe('B')
  })

  it('stamps a new edit later than anything already seen, even if the clock is behind', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
    // Another device (clock 1h ahead) stamped this record.
    importSnapshot({
      ...exportSnapshot(),
      tags: [{ id: 'a', name: 'theirs', color: '#000' }] as never,
      meta: { ...readMeta(), updated: { tasks: {}, tags: { a: '2026-10-01T11:00:00.000Z' }, rules: {} } },
    })
    writeCollection('tags', [{ id: 'a', name: 'mine', color: '#000' }])
    expect(readMeta().updated.tags.a).toBe('2026-10-01T11:00:00.001Z')
  })
})
