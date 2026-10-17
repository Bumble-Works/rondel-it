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

const DRIVE = '/Users/me/Library/CloudStorage/GoogleDrive/My Drive'

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

    drive.wipe() // someone deleted the folder in Finder
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
})
