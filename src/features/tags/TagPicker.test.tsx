import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { TagPicker } from './TagPicker'
const tags = [{ id: 'a', name: 'Alpha', color: '#000' }, { id: 'b', name: 'Beta', color: '#fff' }]
it('closes after one toggle, clears search and preserves selected tags on reopening', () => {
  function Example() {
    const [selected, setSelected] = useState<string[]>([])
    return <TagPicker tags={tags} selectedIds={selected} onToggle={id => setSelected([...selected, id])} onCreate={vi.fn()} />
  }
  render(<Example />)
  const trigger = screen.getByRole('button', { name: 'Tags' })
  fireEvent.click(trigger)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Al' } })
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Alpha' }))
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  expect(screen.getByRole('textbox')).toHaveValue('')
  expect(screen.getByRole('menuitemcheckbox', { name: 'Alpha' })).toBeChecked()
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Beta' }))
  expect(screen.getByRole('button', { name: 'Remove Alpha' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Beta' })).toBeInTheDocument()
})
it('keeps failed creation open for retry and closes only after success', async () => {
  const create = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'new' })
  render(<TagPicker tags={[]} selectedIds={[]} onToggle={vi.fn()} onCreate={create} />)
  fireEvent.click(screen.getByRole('button', { name: 'Tags' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New' } })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Create #New' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('textbox')).toHaveValue('New')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Create #New' }))
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  expect(create).toHaveBeenCalledTimes(2)
})
