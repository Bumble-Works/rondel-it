import { fireEvent, render, screen } from '@testing-library/react'
import { BackupSettings } from './BackupSettings'
import { exportBackup } from '../../services/backup/exportBackup'

vi.mock('../../services/backup/exportBackup', () => ({ exportBackup: vi.fn() }))

it('shows privacy and restore limitations, reports failure, and allows retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(exportBackup).mockRejectedValueOnce(new Error('Disk full')).mockResolvedValueOnce(true)
  render(<BackupSettings />)
  expect(screen.getByText(/not encrypted/)).toBeVisible()
  expect(screen.getByText(/Restoring a backup is not available yet/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('try again')
  fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Check that the file was saved')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('blocks duplicate exports and does not report a cancelled save as success', async () => {
  let finish!: (value: boolean) => void
  vi.mocked(exportBackup).mockReturnValue(new Promise(resolve => { finish = resolve }))
  render(<BackupSettings />)
  const button = screen.getByRole('button', { name: 'Export backup' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(button).toBeDisabled()
  expect(exportBackup).toHaveBeenCalledTimes(1)
  finish(false)
  await screen.findByRole('button', { name: 'Export backup' })
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('says the backup was saved in the desktop app', async () => {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
  try {
    vi.mocked(exportBackup).mockResolvedValueOnce(true)
    render(<BackupSettings />)
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Backup saved.')
  } finally {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  }
})
