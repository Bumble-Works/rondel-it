import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { useSync } from '../sync/useSync'
import { DOWNLOAD_URL } from '../sidebar/DemoNotice'
import { SyncSettings } from './SyncSettings'

const openExternal = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../shared/openExternal', () => ({ openExternal }))

function syncWith(available: boolean): ReturnType<typeof useSync> {
  return {
    state: { available, folder: null, lastSyncedAt: null, syncing: false, warning: null },
    chooseFolder: vi.fn(),
    sync: vi.fn(),
    showInFinder: vi.fn(),
    turnOff: vi.fn(),
  } as unknown as ReturnType<typeof useSync>
}

describe('SyncSettings', () => {
  it('in the browser, says sync is in the desktop apps and links to the download', async () => {
    render(<SyncSettings sync={syncWith(false)} />)

    expect(screen.getByText(/Sync is available in the Mac and Windows apps\./)).toBeInTheDocument()
    expect(screen.queryByText(/Install that service’s desktop app/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose folder…' })).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Download the app' })
    expect(link).toHaveAttribute('href', DOWNLOAD_URL)
    await userEvent.click(link)
    expect(openExternal).toHaveBeenCalledWith(DOWNLOAD_URL)
  })

  it('in the desktop app, keeps the folder setup text and Choose folder…', () => {
    render(<SyncSettings sync={syncWith(true)} />)

    expect(screen.getByText(/Install that service’s desktop app, then choose a folder inside it\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose folder…' })).toBeInTheDocument()
    expect(screen.queryByText(/Sync is available in the Mac and Windows apps/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Download the app' })).not.toBeInTheDocument()
  })
})
