import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StartAtLoginSetting } from './StartAtLoginSetting'

const login = vi.hoisted(() => {
  let on = false
  return {
    isStartAtLoginOn: vi.fn(async () => on),
    setStartAtLogin: vi.fn(async (next: boolean) => (on = next)),
  }
})
vi.mock('../../shared/startAtLogin', () => login)

describe('StartAtLoginSetting', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  })

  it('is hidden in the browser version', () => {
    const { container } = render(<StartAtLoginSetting reportError={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is off by default in the Mac app and turns it on', async () => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    render(<StartAtLoginSetting reportError={() => {}} />)
    const box = screen.getByRole('checkbox', { name: /Start Rondel It at login/ })
    await waitFor(() => expect(box).toBeEnabled())
    expect(box).not.toBeChecked()
    expect(box.closest('label')).toHaveTextContent('A menu-bar icon shows it’s running')

    fireEvent.click(box)
    await waitFor(() => expect(box).toBeChecked())
    expect(login.setStartAtLogin).toHaveBeenCalledWith(true)
  })
})
