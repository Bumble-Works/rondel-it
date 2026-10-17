import { fireEvent, render, screen } from '@testing-library/react'
import { DatePickModal } from './DatePickModal'

describe('DatePickModal', () => {
  it('will not confirm a cleared date', () => {
    const onConfirm = vi.fn()
    render(<DatePickModal open onClose={() => {}} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByLabelText('Move this task to'), { target: { value: '' } })
    const button = screen.getByRole('button', { name: 'Rondel it' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
