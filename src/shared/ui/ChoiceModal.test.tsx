import { fireEvent, render, screen } from '@testing-library/react'
import { ChoiceModal } from './ChoiceModal'

describe('ChoiceModal', () => {
  it('reports the chosen option, or a cancel', () => {
    const onChoose = vi.fn()
    const onCancel = vi.fn()
    render(
      <ChoiceModal
        open
        title="Change the reminder for…"
        message="This is a recurring task."
        choices={[{ value: 'one', label: 'Only this one' }, { value: 'all', label: 'All', primary: true }]}
        onChoose={onChoose}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onChoose).toHaveBeenCalledWith('all')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
