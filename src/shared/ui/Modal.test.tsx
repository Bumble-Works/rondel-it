import { fireEvent, render } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
  it('closes only the top modal on Escape', () => {
    const closeBottom = vi.fn()
    const closeTop = vi.fn()
    render(
      <>
        <Modal open onClose={closeBottom}>bottom</Modal>
        <Modal open onClose={closeTop}>top</Modal>
      </>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeTop).toHaveBeenCalledTimes(1)
    expect(closeBottom).not.toHaveBeenCalled()
  })
})
