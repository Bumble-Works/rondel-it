import { exportSnapshot, writeCollection } from '../storage/localStore'
import type { FolderAccess } from './folder'
import { getSyncFolder, startSyncingTo, syncDirFor, syncNow } from './syncService'

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
  return { fs, files, dirs, wipe: () => (files.clear(), dirs.clear()) }
}

/** Simulates switching to another Mac: its own storage, same sync folder. */
function switchDevice(saved: Map<string, Storage>, name: string) {
  const current = { ...localStorage } as Record<string, string>
  saved.set('__last', current as unknown as Storage)
  localStorage.clear()
  const next = saved.get(name) as unknown as Record<string, string> | undefined
  for (const [k, v] of Object.entries(next ?? {})) localStorage.setItem(k, v)
  return current
}

const DRIVE = '/Users/me/Library/CloudStorage/GoogleDrive/My Drive'

describe('folder sync', () => {
  it('puts the data in a "Rondel It" folder inside the picked one', () => {
    expect(syncDirFor(DRIVE)).toBe(`${DRIVE}/Rondel It`)
    expect(syncDirFor(`${DRIVE}/Rondel It/`)).toBe(`${DRIVE}/Rondel It`)
  })

  it('creates the folder with a README and shares data between devices', async () => {
    const drive = memoryFolder()
    const devices = new Map<string, Storage>()

    writeCollection('tags', [{ id: 'work', name: 'work', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)
    expect(drive.files.get(`${DRIVE}/Rondel It/README.txt`)).toContain("Please don't edit")
    const macA = switchDevice(devices, 'macB')

    // Mac B: fresh install, points at the same folder.
    await startSyncingTo(drive.fs, DRIVE)
    const result = await syncNow(drive.fs)
    expect(result.changed).toBe(true)
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['work'])
    expect(macA['rondel.sync.deviceId']).not.toBe(localStorage.getItem('rondel.sync.deviceId'))
  })

  it('rebuilds a deleted sync folder from local data, losing nothing', async () => {
    const drive = memoryFolder()
    writeCollection('tags', [{ id: 'home', name: 'home', color: '#000' }])
    await startSyncingTo(drive.fs, DRIVE)
    await syncNow(drive.fs)

    drive.wipe() // someone deleted the folder in Finder
    const result = await syncNow(drive.fs)
    expect(result.rebuilt).toBe(true)
    expect(exportSnapshot().tags.map((t) => t.id)).toEqual(['home'])
    expect([...drive.files.keys()].some((f) => f.endsWith('.json'))).toBe(true)
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
})
