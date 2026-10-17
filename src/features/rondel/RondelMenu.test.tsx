import { render, screen } from '@testing-library/react'
import { RondelMenu } from './RondelMenu'

describe('RondelMenu', () => {
  it('stays in place but disabled, explaining why, when the task cannot be rondeled', () => {
    render(<RondelMenu onRondel={() => {}} onPickDate={() => {}} disabledReason="Done — nothing left to rondel" />)
    const button = screen.getByRole('button', { name: 'Rondel this task' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Done — nothing left to rondel')
  })
})
