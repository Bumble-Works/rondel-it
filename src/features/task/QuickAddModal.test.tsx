import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tag } from '../../domain/types'
import { QuickAddModal } from './QuickAddModal'

const tag: Tag = { id: 'fam', name: 'fam', color: '#6aa3ff' }

describe('QuickAddModal', () => {
  it('keeps the composer open when Escape closes its tag picker, and saves the chosen time', async () => {
    const onAdd = vi.fn().mockResolvedValue(true)
    const onClose = vi.fn()
    render(<QuickAddModal open tags={[tag]} weekStartDay={1} onCreateTag={async () => null} onAdd={onAdd} onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText('What needs doing?'), 'Call mom @10:00{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Tags' }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'fam' }))
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledWith('Call mom', ['fam'], expect.any(Object), expect.any(Object), '10:00')
  })

  it('does not attach a chosen time to a Bucket List destination', async () => {
    const onAdd = vi.fn().mockResolvedValue(false)
    render(<QuickAddModal open tags={[]} weekStartDay={1} onCreateTag={async () => null} onAdd={onAdd} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('What needs doing?'), 'Call mom 10:00{Enter}')
    fireEvent.change(screen.getByLabelText('Add to'), { target: { value: 'bucket' } })
    expect(screen.getByRole('button', { name: 'Add time' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd.mock.calls[0]?.[4]).toBeNull()
  })

  it('keeps the draft open when saving fails', async () => {
    const onAdd = vi.fn().mockResolvedValue(false)
    const onClose = vi.fn()

    render(
      <QuickAddModal
        open
        tags={[tag]}
        weekStartDay={1}
        onCreateTag={async () => null}
        onAdd={onAdd}
        onClose={onClose}
      />,
    )

    const input = screen.getByPlaceholderText('What needs doing?') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Call mom #fam' } })

    const option = await screen.findByRole('option', { name: /#fam/i })
    fireEvent.mouseDown(option)

    const dest = screen.getByLabelText('Add to') as HTMLSelectElement
    fireEvent.change(dest, { target: { value: 'next-month' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()

    expect(input.value).toContain('Call mom')
    expect(dest.value).toBe('next-month')
    expect(screen.getByText('fam')).toBeInTheDocument()
    expect(onAdd.mock.calls[0]?.[1]).toEqual(['fam'])
  })

  it('uses Escape to dismiss tag suggestions without closing the composer', async () => {
    const onClose = vi.fn()

    render(
      <QuickAddModal
        open
        tags={[tag]}
        weekStartDay={1}
        onCreateTag={async () => null}
        onAdd={async () => true}
        onClose={onClose}
      />,
    )

    const input = screen.getByPlaceholderText('What needs doing?')
    fireEvent.change(input, { target: { value: 'Call mom #fam' } })

    await screen.findByRole('listbox', { name: 'Tag suggestions' })
    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Tag suggestions' })).not.toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Add a task' })).toBeInTheDocument()
  })
})
