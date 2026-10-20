import { renderHook, waitFor } from '@testing-library/react'
import { useAppBadge } from './appBadge'

const win = vi.hoisted(() => ({ setBadgeLabel: vi.fn(async () => {}), setOverlayIcon: vi.fn(async () => {}) }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => win }))
vi.mock('@tauri-apps/api/image', () => ({ Image: { fromBytes: vi.fn(async () => 'dot-image') } }))

const tauriWindow = window as unknown as Record<string, unknown>

describe('useAppBadge', () => {
  beforeEach(() => {
    tauriWindow.__TAURI_INTERNALS__ = {}
    vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(0) })))
    win.setBadgeLabel.mockClear()
    win.setOverlayIcon.mockClear()
  })
  afterEach(() => {
    delete tauriWindow.__TAURI_INTERNALS__
  })

  it('shows the Dock dot while any prompt is open, and clears it once none is', async () => {
    const nag = renderHook((open: boolean) => useAppBadge('nag', open), { initialProps: true })
    const reminders = renderHook((open: boolean) => useAppBadge('reminders', open), { initialProps: true })
    await waitFor(() => expect(win.setBadgeLabel).toHaveBeenCalledWith('•'))

    nag.rerender(false)
    expect(win.setBadgeLabel).toHaveBeenCalledTimes(1) // the reminders still prompt

    reminders.rerender(false)
    await waitFor(() => expect(win.setBadgeLabel).toHaveBeenLastCalledWith(undefined))
  })

  it('uses a taskbar overlay dot on Windows', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    const { rerender } = renderHook((open: boolean) => useAppBadge('nag', open), { initialProps: true })
    await waitFor(() => expect(win.setOverlayIcon).toHaveBeenCalledWith('dot-image'))
    rerender(false)
    await waitFor(() => expect(win.setOverlayIcon).toHaveBeenLastCalledWith(undefined))
    expect(win.setBadgeLabel).not.toHaveBeenCalled()
  })
})
