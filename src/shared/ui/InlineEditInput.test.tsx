import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineEditInput } from './InlineEditInput'

describe('InlineEditInput', () => {
  it('saves once on blur, keeping spaces typed along the way', async () => {
    const onCommit = vi.fn()
    render(<InlineEditInput aria-label="Title" value="Weekly" onCommit={onCommit} />)
    const input = screen.getByLabelText('Title')

    await userEvent.type(input, ' review ')
    expect(onCommit).not.toHaveBeenCalled()
    expect(input).toHaveValue('Weekly review ')

    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('Weekly review')
  })

  it('restores the saved value on Escape or when cleared', async () => {
    const onCommit = vi.fn()
    render(<InlineEditInput aria-label="Title" value="Weekly" onCommit={onCommit} />)
    const input = screen.getByLabelText('Title')

    await userEvent.type(input, ' x{Escape}')
    expect(input).toHaveValue('Weekly')

    await userEvent.clear(input)
    fireEvent.blur(input)
    expect(input).toHaveValue('Weekly')
    expect(onCommit).not.toHaveBeenCalled()
  })
})
