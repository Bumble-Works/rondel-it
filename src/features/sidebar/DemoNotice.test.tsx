import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DemoNotice, DOWNLOAD_URL } from './DemoNotice'

const openExternal = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../shared/openExternal', () => ({ openExternal }))

afterEach(() => { delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ })

describe('DemoNotice', () => {
  it('shows a Demo label in the browser with the tooltip closed', () => {
    render(<DemoNotice />)
    expect(screen.getByRole('button', { name: 'Demo' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('is absent in the desktop app', () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    const { container } = render(<DemoNotice />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens from the keyboard, describes the label, and reaches the download link', async () => {
    render(<DemoNotice />)
    await userEvent.tab()
    const label = screen.getByRole('button', { name: 'Demo' })
    expect(label).toHaveFocus()
    expect(label).toHaveAttribute('aria-expanded', 'true')
    expect(label).toHaveAccessibleDescription(/saved only in this browser/)

    await userEvent.tab()
    const link = screen.getByRole('link', { name: 'download the app' })
    expect(link).toHaveFocus()
    expect(link).toHaveAttribute('href', DOWNLOAD_URL)
    await userEvent.keyboard('{Enter}')
    expect(openExternal).toHaveBeenCalledWith(DOWNLOAD_URL)

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('closes when focus leaves', async () => {
    render(<><DemoNotice /><button type="button">Elsewhere</button></>)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('Escape from the link closes the note and returns focus to Demo', async () => {
    render(<DemoNotice />)
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'download the app' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Demo' })).toHaveFocus()
  })

  it('click (without hover, as on touch) toggles the note and an outside press closes it', () => {
    render(<><DemoNotice /><p>Outside</p></>)
    const label = screen.getByRole('button', { name: 'Demo' })
    fireEvent.click(label)
    expect(label).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(label)
    expect(label).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(label)
    fireEvent.pointerDown(screen.getByText('Outside'))
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})
