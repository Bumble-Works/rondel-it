import { exists, mkdir, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

/** File access the sync service needs; the Mac app implements it with Tauri. */
export interface FolderAccess {
  exists(path: string): Promise<boolean>
  ensureDir(path: string): Promise<void>
  listFiles(dir: string): Promise<string[]>
  read(path: string): Promise<string>
  write(path: string, text: string): Promise<void>
}

export const tauriFolder: FolderAccess = {
  exists: (path) => exists(path),
  ensureDir: (path) => mkdir(path, { recursive: true }),
  listFiles: async (dir) => (await readDir(dir)).filter((e) => e.isFile).map((e) => e.name),
  read: (path) => readTextFile(path),
  write: (path, text) => writeTextFile(path, text),
}

/** True inside the Mac app (Tauri); the browser version can't reach folders. */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
