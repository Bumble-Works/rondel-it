import { isDesktopApp } from '../services/sync/folder'

/**
 * Asks for permission to show notifications (once; macOS remembers). Call it
 * from a user action, e.g. setting a reminder, so the prompt makes sense.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isDesktopApp()) {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    return (await isPermissionGranted()) || (await requestPermission()) === 'granted'
  }
  if (!('Notification' in window)) return false
  if (Notification.permission === 'default') await Notification.requestPermission()
  return Notification.permission === 'granted'
}

/** Shows a system notification (Notification Center in the Mac app). */
export async function notify(title: string, body: string): Promise<void> {
  if (!(await ensureNotificationPermission())) {
    console.error('[rondel] Notifications are off; not shown:', title, body)
    return
  }
  if (isDesktopApp()) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification')
    sendNotification({ title, body })
    return
  }
  new Notification(title, { body })
}
