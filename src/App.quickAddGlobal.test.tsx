import { renderWithQuery as render } from './test/queryTestUtils'
import { fireEvent, screen } from '@testing-library/react'
import App from './App'

describe('App quick add availability', () => {
  it('keeps quick add available on Settings and Recurring pages', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await screen.findByRole('heading', { name: 'Settings' })

    fireEvent.click(screen.getByRole('button', { name: 'Add a task' }))
    expect(screen.getByRole('dialog', { name: 'Add a task' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    fireEvent.click(screen.getByRole('button', { name: '← Back to tasks' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recurring' }))
    await screen.findByText('Your recurring tasks')

    fireEvent.keyDown(window, { key: 'n' })
    expect(screen.getByRole('dialog', { name: 'Add a task' })).toBeInTheDocument()
  })
})
