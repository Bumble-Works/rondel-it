import { fireEvent, render, screen } from '@testing-library/react'
import { TaskNoteField } from './TaskNoteField'

it('keeps an existing note editable without saving unchanged text on blur', () => {
  const save = vi.fn()
  const note = 'First https://example.com\nSecond www.example.org'
  render(<TaskNoteField note={note} onSave={save} />)
  const field = screen.getByRole('textbox', { name: 'Note' })
  expect(field).toHaveValue(note)
  fireEvent.blur(field)
  expect(field).toBeInTheDocument()
  expect(save).not.toHaveBeenCalled()
})

it('saves the full edited note on blur and resets when the task changes', () => {
  const save = vi.fn()
  const { rerender } = render(<TaskNoteField key="a" note="Original" onSave={save} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Changed\nhttps://example.com' } })
  fireEvent.blur(screen.getByRole('textbox'))
  expect(save).toHaveBeenCalledWith('Changed\nhttps://example.com')
  rerender(<TaskNoteField key="a" note={'Changed\nhttps://example.com'} onSave={save} />)
  expect(screen.getByRole('textbox')).toHaveValue('Changed\nhttps://example.com')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unfinished' } })
  rerender(<TaskNoteField key="b" note="Other task" onSave={save} />)
  expect(screen.getByRole('textbox')).toHaveValue('Other task')
})

it('allows an empty note to be entered and saved', () => {
  const save = vi.fn()
  render(<TaskNoteField note="" onSave={save} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New note' } })
  fireEvent.blur(screen.getByRole('textbox'))
  expect(save).toHaveBeenCalledWith('New note')
})
