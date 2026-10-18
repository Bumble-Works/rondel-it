import { fireEvent, render, screen } from '@testing-library/react'
import { RondelMenu } from './RondelMenu'

describe('RondelMenu', () => {
  it('stays in place but disabled, explaining why, when the task cannot be rondeled', () => {
    render(<RondelMenu onRondel={() => {}} onPickDate={() => {}} disabledReason="Done — nothing left to rondel" />)
    const button = screen.getByRole('button', { name: 'Rondel this task' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Done — nothing left to rondel')
  })

  it('words a Bucket List item as scheduling, and hides the Bucket List option', () => {
    render(<RondelMenu onRondel={() => {}} onPickDate={() => {}} inBucketList />)
    const button = screen.getByRole('button', { name: 'Schedule this task' })
    expect(button).toHaveAttribute('title', 'Schedule it — give it a day')

    fireEvent.click(button)
    expect(screen.getByText('Schedule it for…')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Next week' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Bucket List' })).not.toBeInTheDocument()
  })
})
