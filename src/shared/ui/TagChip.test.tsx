import { fireEvent, render, screen } from '@testing-library/react'
import { TagChip } from './TagChip'

describe('TagChip', () => {
  it('supports keyboard activation when interactive', () => {
    const onClick = vi.fn()
    render(<TagChip name="Focus" color="#fff" onClick={onClick} />)
    const chip = screen.getByRole('button', { name: 'Focus' })
    fireEvent.keyDown(chip, { key: 'Enter' })
    fireEvent.keyDown(chip, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
