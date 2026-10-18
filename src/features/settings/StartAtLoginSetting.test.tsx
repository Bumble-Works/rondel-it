import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StartAtLoginSetting } from './StartAtLoginSetting'

const autostart = vi.hoisted(() => {
  let on = false
  return {
    isEnabled: vi.fn(async () => on),
    enable: vi.fn(async () => void (on = true)),
    disable: vi.fn(async () => void (on = false)),
  }
})
vi.mock('@tauri-apps/plugin-autostart', () => autostart)

describe('StartAtLoginSetting', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  })

  it('is hidden in the browser version', () => {
    const { container } = render(<StartAtLoginSetting reportError={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is off by default in the Mac app and turns the login item on', async () => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    render(<StartAtLoginSetting reportError={() => {}} />)
    const box = screen.getByRole('checkbox', { name: /Start Rondel It at login/ })
    await waitFor(() => expect(box).toBeEnabled())
    expect(box).not.toBeChecked()

    fireEvent.click(box)
    await waitFor(() => expect(box).toBeChecked())
    expect(autostart.enable).toHaveBeenCalled()
  })
})
