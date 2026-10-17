import { exportSnapshot, importSnapshot, readMeta, writeCollection } from './localStore'

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
})
