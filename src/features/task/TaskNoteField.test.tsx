import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskNoteField } from './TaskNoteField'

it('opens reading links by pointer and keyboard without entering edit mode', async () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const user = userEvent.setup()
  render(<TaskNoteField note={'First https://example.com\nSecond www.example.org\njavascript:alert(1)'} onSave={vi.fn()} />)
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(2)
  await user.click(links[0])
  links[1].focus()
  await user.keyboard('{Enter}')
  expect(open).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(document.querySelector('.task-note-reading')?.textContent).toContain('\nSecond')
})

it('saves the full edited note on blur and resets when the task changes', () => {
  const save = vi.fn()
  const { rerender } = render(<TaskNoteField key="a" note="Original" onSave={save} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit note' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Changed\nhttps://example.com' } })
  fireEvent.blur(screen.getByRole('textbox'))
  expect(save).toHaveBeenCalledWith('Changed\nhttps://example.com')
  rerender(<TaskNoteField key="a" note={'Changed\nhttps://example.com'} onSave={save} />)
  expect(screen.getByRole('link')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit note' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unfinished' } })
  rerender(<TaskNoteField key="b" note="Other task" onSave={save} />)
  expect(screen.getByText('Other task')).toBeInTheDocument()
  expect(screen.queryByText('Unfinished')).not.toBeInTheDocument()
})

it('allows an empty note to be entered and saved', () => {
  const save = vi.fn()
  render(<TaskNoteField note="" onSave={save} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New note' } })
  fireEvent.blur(screen.getByRole('textbox'))
  expect(save).toHaveBeenCalledWith('New note')
})
