import { fireEvent, render, screen } from '@testing-library/react'
import { RondelMenu } from './RondelMenu'

const openMenu = (props: Partial<Parameters<typeof RondelMenu>[0]> = {}) => {
  const onRondel = vi.fn()
  render(<RondelMenu onRondel={onRondel} onPickDate={() => {}} weekStartDay={1} {...props} />)
  fireEvent.click(screen.getByRole('button', { name: props.inBucketList ? 'Schedule this task' : 'Rondel this task' }))
  return onRondel
}

describe('RondelMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 25, 12)) // Wednesday, November 25
  })
  afterEach(() => vi.useRealTimers())

  it('stays in place but disabled, explaining why, when the task cannot be rondeled', () => {
    render(<RondelMenu onRondel={() => {}} onPickDate={() => {}} disabledReason="Done — nothing left to rondel" />)
    const button = screen.getByRole('button', { name: 'Rondel this task' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Done — nothing left to rondel')
  })

  it('words a Bucket List item as scheduling, and hides the Bucket List option', () => {
    openMenu({ inBucketList: true })
    expect(screen.getByRole('button', { name: 'Schedule this task' })).toHaveAttribute('title', 'Schedule it — give it a day')
    expect(screen.getByText('Schedule it for…')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Next week’s Unassigned' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Bucket List' })).not.toBeInTheDocument()
  })

  it('puts Next week and Next month on the first day of that period, showing the day', () => {
    const onRondel = openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Next week · Monday, November 30' }))
    expect(onRondel).toHaveBeenCalledWith({ toDate: '2026-11-30' })

    fireEvent.click(screen.getByRole('button', { name: 'Rondel this task' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Next month · Tuesday, December 1' }))
    expect(onRondel).toHaveBeenLastCalledWith({ toDate: '2026-12-01' })
  })

  it('keeps the Unassigned choices under No day yet, without asking for a to-do', () => {
    const onRondel = openMenu()
    expect(screen.getByText('No day yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Next week’s Unassigned' }))
    expect(onRondel).toHaveBeenCalledWith({ toDate: '2026-11-30', rondeled: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rondel this task' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Next month’s Unassigned' }))
    expect(onRondel).toHaveBeenLastCalledWith({ toDate: '2026-12-01', rondeled: true })
  })

  it('asks before taking the day away from an in-progress task; Cancel leaves it untouched', () => {
    const onRondel = openMenu({ inProgress: true })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Next week’s Unassigned' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('This task is in progress. Move it to next week’s Unassigned list?')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onRondel).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rondel this task' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Bucket List' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Move it to the Bucket List?')
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    expect(onRondel).toHaveBeenCalledWith({ toBucket: 'bucket-list' })
  })

  it('does not ask for an in-progress task given a day', () => {
    const onRondel = openMenu({ inProgress: true })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Next week · Monday, November 30' }))
    expect(onRondel).toHaveBeenCalledWith({ toDate: '2026-11-30' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables a dated item for the day the task is already on, saying why', () => {
    const onRondel = openMenu({ currentDay: '2026-11-30' })
    const nextWeek = screen.getByRole('menuitem', { name: 'Next week · Monday, November 30' })
    expect(nextWeek).toBeDisabled()
    expect(nextWeek).toHaveAttribute('title', 'Already on Monday, November 30')
    fireEvent.click(nextWeek)
    expect(onRondel).not.toHaveBeenCalled()
    expect(screen.getByRole('menuitem', { name: 'Tomorrow' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Next week’s Unassigned' })).toBeEnabled()
  })
})
