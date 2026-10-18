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

  it('marks a selected pickable chip with a check and aria-pressed', () => {
    const { rerender } = render(<TagChip name="work" color="#3b82f6" onClick={() => {}} active={false} />)
    const chip = screen.getByRole('button', { name: 'work' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(chip).not.toHaveTextContent('✓')

    rerender(<TagChip name="work" color="#3b82f6" onClick={() => {}} active />)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(chip).toHaveTextContent('✓')
  })
})
