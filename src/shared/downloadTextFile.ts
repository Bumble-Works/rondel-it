import { isDesktopApp } from '../services/sync/folder'

/** Returns false when the native save dialog is cancelled. Browser success means download requested. */
export async function downloadTextFile(filename: string, content: string, mime: string, filter: { name: string; extensions: string[] }): Promise<boolean> {
  if (isDesktopApp()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({ defaultPath: filename, filters: [filter] })
    if (path === null) return false
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, content)
    return true
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    return true
  } finally {
    link.remove()
    // Allow the browser to consume the download before releasing its memory.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
