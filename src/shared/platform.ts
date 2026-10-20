/** True on Windows (the Windows app, or a browser on Windows). */
export function isWindows(): boolean {
  return typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent)
}

/** What this computer calls the things the UI mentions. */
export function platformWords() {
  return isWindows()
    ? { fileManager: 'File Explorer', trayIcon: 'system tray icon' }
    : { fileManager: 'Finder', trayIcon: 'menu-bar icon' }
}
