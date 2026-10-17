import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusCircle } from './StatusCircle'

describe('StatusCircle', () => {
  it('invokes click and double-click actions when enabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onDoubleClick = vi.fn()
    render(<StatusCircle status="todo" onClick={onClick} onDoubleClick={onDoubleClick} />)

    const button = screen.getByRole('button', { name: 'Mark as doing' })
    await user.click(button)
    await user.dblClick(button)

    expect(onClick).toHaveBeenCalled()
    expect(onDoubleClick).toHaveBeenCalled()
  })

  it('uses canceled label and supports disabled state', () => {
    render(<StatusCircle status="canceled" disabled />)
    const button = screen.getByRole('button', { name: 'Mark as to-do' })
    expect(button).toBeDisabled()
  })
})
