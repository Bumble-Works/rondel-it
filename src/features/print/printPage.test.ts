import { printPage } from './printPage'

const mocks = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }))
vi.mock('../../services/sync/folder', () => ({ isDesktopApp: () => mocks.desktop }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))

it('opens browser printing and routes desktop printing through the existing native command', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {})
  mocks.desktop = false
  await printPage()
  expect(print).toHaveBeenCalledOnce()
  mocks.desktop = true
  mocks.invoke.mockResolvedValue(undefined)
  await printPage()
  expect(mocks.invoke).toHaveBeenCalledWith('print_page')
  expect(print).toHaveBeenCalledOnce()
})
