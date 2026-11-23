import { renderWithQuery as render } from './test/queryTestUtils'
import { cleanup, screen, within } from '@testing-library/react'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import App from './App'

afterEach(async () => {
  // Unmount and let Tauri's async unlisten calls finish before the mocked bridge goes away.
  cleanup()
  await new Promise((done) => setTimeout(done, 0))
  clearMocks()
})

function topBar(container: HTMLElement): HTMLElement {
  const bar = container.querySelector<HTMLElement>('.app-topbar')
  if (!bar) throw new Error('No top bar')
  return bar
}

describe('App Demo label', () => {
  it('shows the Demo label in the phone top bar without opening the sidebar', async () => {
    const { container } = render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Today' })

    expect(screen.getByRole('button', { name: 'Show sidebar' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(topBar(container)).getByRole('button', { name: 'Demo' })).toBeInTheDocument()
  })

  it('shows no Demo label in the desktop app', async () => {
    mockIPC(() => null, { shouldMockEvents: true })
    const { container } = render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Today' })

    expect(within(topBar(container)).queryByRole('button', { name: 'Demo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Demo' })).not.toBeInTheDocument()
  })
})
