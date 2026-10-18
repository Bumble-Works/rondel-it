import { fireEvent, render, screen } from '@testing-library/react'
import { RepeatPicker, type RepeatChoice } from './RepeatPicker'

function setup() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 19, 9)) // Mon Oct 19
  const choices: RepeatChoice[] = []
  render(<RepeatPicker onChange={(c) => choices.push(c)} />)
  const last = () => choices[choices.length - 1]
  return { last }
}

describe('RepeatPicker', () => {
  it('starts weekly from today and offers the presets', () => {
    setup()
    expect(screen.getByLabelText('Repeats')).toHaveValue('weekly')
    expect(screen.getByText('Every week on Mon')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'weekdays' } })
    expect(screen.getByText('Every weekday')).toBeInTheDocument()
  })

  it('builds a custom "every 2 weeks on Mon and Thu"', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Every'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thursday' }))
    expect(last()).toEqual({
      kind: 'repeat',
      repeat: expect.objectContaining({ unit: 'week', every: 2, weekdays: [1, 4], startDate: '2026-10-19' }),
    })
    expect(screen.getByText('Every 2 weeks on Mon, Thu')).toBeInTheDocument()
  })

  it('builds "every month on the first Monday", with an end date', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'month' } })
    fireEvent.click(screen.getAllByRole('radio')[1])
    fireEvent.change(screen.getByLabelText('Which week'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('End repeat'), { target: { value: 'date' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-06-30' } })
    expect(last()).toEqual({
      kind: 'repeat',
      repeat: expect.objectContaining({ unit: 'month', monthly: { type: 'weekday', nth: 1, weekday: 1 }, endDate: '2027-06-30' }),
    })
    expect(screen.getByText('Every month on the first Monday until Jun 30')).toBeInTheDocument()
  })

  it('still offers the rondel "start of every week/month" rules', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'weekly-start' } })
    expect(last()).toEqual({ kind: 'weekly-start' })
    expect(screen.queryByLabelText('Starts')).not.toBeInTheDocument()
  })
})
