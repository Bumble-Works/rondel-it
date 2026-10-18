import { restoreMenuBarIcon, setStartAtLogin } from './startAtLogin'

const fake = vi.hoisted(() => {
  const state = { loginItem: false, tray: null as null | { id: string } }
  return {
    state,
    autostart: {
      isEnabled: vi.fn(async () => state.loginItem),
      enable: vi.fn(async () => void (state.loginItem = true)),
      disable: vi.fn(async () => void (state.loginItem = false)),
    },
    tray: {
      TrayIcon: {
        getById: vi.fn(async () => state.tray),
        removeById: vi.fn(async () => void (state.tray = null)),
        new: vi.fn(async (opts: { id: string }) => (state.tray = { id: opts.id })),
      },
    },
  }
})
vi.mock('@tauri-apps/plugin-autostart', () => fake.autostart)
vi.mock('@tauri-apps/api/tray', () => fake.tray)
vi.mock('@tauri-apps/api/menu', () => ({
  Menu: { new: vi.fn(async () => ({})) },
  MenuItem: { new: vi.fn(async () => ({})) },
  PredefinedMenuItem: { new: vi.fn(async () => ({})) },
}))
vi.mock('@tauri-apps/api/image', () => ({ Image: { fromBytes: vi.fn(async () => ({})) } }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ show: vi.fn(), setFocus: vi.fn() }) }))

describe('start at login + menu-bar icon', () => {
  beforeEach(() => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(0) })))
    fake.state.loginItem = false
    fake.state.tray = null
  })
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  })

  it('adds the menu-bar icon when turned on and removes it when turned off', async () => {
    expect(await setStartAtLogin(true)).toBe(true)
    expect(fake.state.tray).toEqual({ id: 'rondel-it' })
    expect(fake.tray.TrayIcon.new).toHaveBeenCalledWith(expect.objectContaining({ iconAsTemplate: true, tooltip: 'Rondel It' }))

    expect(await setStartAtLogin(false)).toBe(false)
    expect(fake.state.tray).toBeNull()
  })

  it('on app start, shows the icon only if starting at login is on', async () => {
    await restoreMenuBarIcon()
    expect(fake.tray.TrayIcon.new).not.toHaveBeenCalled()

    fake.state.loginItem = true
    await restoreMenuBarIcon()
    expect(fake.state.tray).toEqual({ id: 'rondel-it' })
  })
})
