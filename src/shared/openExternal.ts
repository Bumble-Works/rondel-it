import { isDesktopApp } from '../services/sync/folder'

/** Opens a link in the default browser (the Mac app can't navigate away itself). */
export async function openExternal(href: string): Promise<void> {
  if (!/^https?:\/\//i.test(href)) throw new Error(`Not a web link: ${href}`)
  if (!isDesktopApp()) {
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener')
  await openUrl(href)
}
