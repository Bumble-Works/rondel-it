import { exportSnapshot, writeCollection } from '../storage/localStore'
import type { FolderAccess } from './folder'
import { SyncFolderUnavailable, getSyncFolder, startSyncingTo, syncDirFor, syncNow } from './syncService'

const DRIVE = '/Users/me/Library/CloudStorage/GoogleDrive/My Drive'

/** In-memory stand-in for a synced folder (e.g. inside Google Drive). */
function memoryFolder() {
  const files = new Map<string, string>()
  const dirs = new Set<string>()
  const fs: FolderAccess = {
    exists: async (p) => dirs.has(p) || files.has(p),
    ensureDir: async (p) => {
      const parts = p.split('/')
      for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'))
    },
    listFiles: async (dir) => [...files.keys()].filter((f) => f.startsWith(`${dir}/`)).map((f) => f.slice(dir.length + 1)),
    read: async (p) => {
      const text = files.get(p)
      if (text === undefined) throw new Error('missing')
      return text
    },
    write: async (p, text) => void files.set(p, text),
  }
  const under = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`)
  const removeUnder = (prefix: string) => {
    for (const f of [...files.keys()].filter(under(prefix))) files.delete(f)
    for (const d of [...dirs].filter(under(prefix))) dirs.delete(d)
  }
  void fs.ensureDir(DRIVE) // the cloud drive's folder exists
  return {
    fs,
    files,
    writes: () => [...files.keys()],
    /** Someone deleted the "Rondel It" folder in Finder. */
    deleteSyncFolder: () => removeUnder(`${DRIVE}/Rondel It`),
    /** The cloud drive isn't running / signed in: its folder is gone. */
    unmount: () => removeUnder(DRIVE),
  }
}

function storageItems(): Record<string, string> {
  const items: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!
    items[key] = localStorage.getItem(key)!
  }
  return items
}

/** Simulates switching to another Mac: saves this one's storage, loads the other's. */
function switchDevice(devices: Map<string, Record<string, string>>, from: string, to: string) {
  devices.set(from, storageItems())
  localStorage.clear()
  for (const [k, v] of Object.entries(devices.get(to) ?? {})) localStorage.setItem(k, v)
}


describe('folder sync', () => {
  it('puts the data in a "Rondel It" folder inside the picked one', () => {
    expect(syncDirFor(DRIVE)).toBe(`${DRIVE}/Rondel It`)
    expect(syncDirFor(`${DRIVE}/Rondel It/`)).toBe(`${DRIVE}/Rondel It`)
  })

  it('creates the folder with a README and shares data between devices', async () => {
    const drive = memoryFolder()
    const devices = new Map<string, Record<string, string>>()

    writeCollection('tags', [{ id: 'work', name: 'work', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)
    expect(drive.files.get(`${DRIVE}/Rondel It/README.txt`)).toContain("Please don't edit")
    switchDevice(devices, 'macA', 'macB')

    // Mac B: fresh install, points at the same folder, gets Mac A's tag.
    await startSyncingTo(drive.fs, DRIVE)
    const result = await syncNow(drive.fs)
    expect(result.changed).toBe(true)
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['work'])
    writeCollection('tags', [...exportSnapshot().tags, { id: 'home', name: 'home', color: '#000' }])
    await syncNow(drive.fs)
    expect(devices.get('macA')!['rondel.sync.deviceId']).not.toBe(localStorage.getItem('rondel.sync.deviceId'))

    // Back on Mac A (its own data restored), it picks up Mac B's new tag.
    switchDevice(devices, 'macB', 'macA')
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['work'])
    await syncNow(drive.fs)
    expect(exportSnapshot().tags.map((t) => t.id).sort()).toEqual(['home', 'work'])
  })

  it('rebuilds a deleted sync folder from local data, losing nothing', async () => {
    const drive = memoryFolder()
    writeCollection('tags', [{ id: 'home', name: 'home', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)

    drive.deleteSyncFolder()
    const result = await syncNow(drive.fs)
    expect(result.rebuilt).toBe(true)
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['home'])
    expect([...drive.files.keys()].some((f) => f.endsWith('.json'))).toBe(true)
  })

  it('ignores a device file with incomplete sync data instead of failing the whole sync', async () => {
    const drive = memoryFolder()
    writeCollection('tags', [{ id: 'home', name: 'home', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    const empty = '{"format":1,"data":{"tasks":[],"tags":[],"rules":[],"meta":{}}}'
    await drive.fs.write(`${getSyncFolder()}/devices/half.json`, empty)

    const result = await syncNow(drive.fs)
    expect(result.unreadable).toEqual(['half.json'])
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['home'])
  })

  it('ignores unreadable or hand-edited device files instead of applying them', async () => {
    const drive = memoryFolder()
    writeCollection('tags', [{ id: 'home', name: 'home', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await drive.fs.write(`${getSyncFolder()}/devices/broken.json`, '{"format":1,"data":"oops"}')

    const result = await syncNow(drive.fs)
    expect(result.unreadable).toEqual(['broken.json'])
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['home'])
  })

  it("refuses to sync when the cloud drive's folder is gone, instead of creating a local stand-in", async () => {
    const drive = memoryFolder()
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)
    drive.unmount()

    await expect(syncNow(drive.fs)).rejects.toBeInstanceOf(SyncFolderUnavailable)
    expect(drive.writes()).toEqual([])
  })

  it('merges edits made on two devices before they synced, and spreads deletions', async () => {
    const drive = memoryFolder()
    const devices = new Map<string, Record<string, string>>()
    writeCollection('tags', [{ id: 'a', name: 'a', color: '#000' }, { id: 'b', name: 'b', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)
    switchDevice(devices, 'macA', 'macB')
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)

    // Offline: Mac B renames "a" and deletes "b"; Mac A adds "c".
    writeCollection('tags', [{ id: 'a', name: 'a (B)', color: '#000' }])
    switchDevice(devices, 'macB', 'macA')
    writeCollection('tags', [...exportSnapshot().tags, { id: 'c', name: 'c', color: '#000' }])
    switchDevice(devices, 'macA', 'macB')
    await syncNow(drive.fs)
    switchDevice(devices, 'macB', 'macA')
    await syncNow(drive.fs)

    expect(exportSnapshot().tags.map((t) => `${t.id}:${t.name}`).sort()).toEqual(['a:a (B)', 'c:c'])
  })

  it('rejects another device whose clock is far ahead, so it cannot override everything', async () => {
    const drive = memoryFolder()
    writeCollection('tags', [{ id: 'a', name: 'mine', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    const future = {
      format: 1,
      deviceId: 'skewed',
      writtenAt: '2099-01-01T00:00:00.000Z',
      data: {
        tasks: [], rules: [], settings: null, tags: [{ id: 'a', name: 'theirs', color: '#000' }],
        meta: { updated: { tasks: {}, tags: { a: '2099-01-01T00:00:00.000Z' }, rules: {} }, deleted: { tasks: {}, tags: {}, rules: {} }, settingsUpdated: null },
      },
    }
    await drive.fs.write(`${getSyncFolder()}/devices/skewed.json`, JSON.stringify(future))

    const result = await syncNow(drive.fs)
    expect(result.unreadable).toEqual(['skewed.json'])
    expect(exportSnapshot().tags).toEqual([{ id: 'a', name: 'mine', color: '#000' }])
  })

  it('gives a copied Mac (same device id) a new id so both keep syncing', async () => {
    const drive = memoryFolder()
    const devices = new Map<string, Record<string, string>>()
    writeCollection('tags', [{ id: 'a', name: 'a', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)
    const original = localStorage.getItem('rondel.sync.deviceId')

    // Clone this Mac's storage onto a second Mac, which then adds a tag and syncs.
    devices.set('clone', storageItems())
    switchDevice(devices, 'macA', 'clone')
    writeCollection('tags', [...exportSnapshot().tags, { id: 'b', name: 'b', color: '#000' }])
    await syncNow(drive.fs)
    switchDevice(devices, 'clone', 'macA')
    await syncNow(drive.fs)

    expect(localStorage.getItem('rondel.sync.deviceId')).not.toBe(original)
    expect(exportSnapshot().tags.map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  it("doesn't rewrite its file when nothing changed", async () => {
    const drive = memoryFolder()
    writeCollection('tags', [{ id: 'a', name: 'a', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)
    const write = vi.spyOn(drive.fs, 'write')
    await syncNow(drive.fs)
    expect(write).not.toHaveBeenCalled()
  })

  it('runs one follow-up pass when asked to sync mid-pass, so a new edit goes out right away', async () => {
    const drive = memoryFolder()
    await startSyncingTo(drive.fs, DRIVE)
    const first = syncNow(drive.fs)
    writeCollection('tags', [{ id: 'late', name: 'late', color: '#000' }])
    const second = syncNow(drive.fs)
    const third = syncNow(drive.fs)
    expect(second).toBe(third) // one follow-up, not one per call
    await Promise.all([first, second])

    const mineFile = [...drive.files.entries()].find(([f]) => f.endsWith(`${localStorage.getItem('rondel.sync.deviceId')}.json`))
    expect(mineFile?.[1]).toContain('"late"')
  })
})
