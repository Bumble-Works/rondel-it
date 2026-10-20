import { isDesktopApp } from '../services/sync/folder'
import { isWindows } from './platform'

const TRAY_ID = 'rondel-it'

/** Is "Start Rondel It at login" on (this computer's login item)? */
export async function isStartAtLoginOn(): Promise<boolean> {
  if (!isDesktopApp()) return false
  const { isEnabled } = await import('@tauri-apps/plugin-autostart')
  return isEnabled()
}

/** Turns the login item on/off; the menu-bar icon follows it. Returns the new state. */
export async function setStartAtLogin(on: boolean): Promise<boolean> {
  const autostart = await import('@tauri-apps/plugin-autostart')
  await (on ? autostart.enable() : autostart.disable())
  const enabled = await autostart.isEnabled()
  await showMenuBarIcon(enabled)
  return enabled
}

/** On app start: show the menu-bar icon if starting at login is on. */
export async function restoreMenuBarIcon(): Promise<void> {
  await showMenuBarIcon(await isStartAtLoginOn())
}

/**
 * The menu-bar (Mac) or system tray (Windows) icon (Open / Quit), shown while
 * the app may be running out of sight, i.e. only when it starts at login.
 */
async function showMenuBarIcon(visible: boolean): Promise<void> {
  if (!isDesktopApp()) return
  const { TrayIcon } = await import('@tauri-apps/api/tray')
  const existing = await TrayIcon.getById(TRAY_ID)
  if (!visible) {
    if (existing) await TrayIcon.removeById(TRAY_ID)
    return
  }
  if (existing) return

  const [{ Menu, MenuItem, PredefinedMenuItem }, { Image }, { getCurrentWindow }] = await Promise.all([
    import('@tauri-apps/api/menu'),
    import('@tauri-apps/api/image'),
    import('@tauri-apps/api/window'),
  ])
  const menu = await Menu.new({
    items: [
      await MenuItem.new({
        id: 'open',
        text: 'Open Rondel It',
        action: async () => {
          const window = getCurrentWindow()
          await window.show()
          await window.setFocus()
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Quit', text: 'Quit Rondel It' }),
    ],
  })
  // Mac: a one-color "template" image that macOS tints for light and dark menu
  // bars. Windows doesn't tint, so it gets the color app icon.
  const windows = isWindows()
  const iconBytes = await fetch(windows ? '/tray-icon-color.png' : '/tray-icon.png').then((r) => r.arrayBuffer())
  await TrayIcon.new({
    id: TRAY_ID,
    icon: await Image.fromBytes(iconBytes),
    iconAsTemplate: !windows,
    tooltip: 'Rondel It',
    menu,
    showMenuOnLeftClick: true,
  })
}
