import { fireEvent, render, screen } from '@testing-library/react'
import { RepeatPicker, type RepeatChoice } from './RepeatPicker'

function setup(initial?: RepeatChoice) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 19, 9)) // Mon Oct 19
  const choices: RepeatChoice[] = []
  render(<RepeatPicker initial={initial} onChange={(c) => choices.push(c)} />)
  const last = () => choices[choices.length - 1]
  return { last }
}

describe('RepeatPicker', () => {
  it('starts daily from today and offers daily, monthly, yearly, custom and the rondel rules', () => {
    setup()
    expect(screen.getByLabelText('Repeats')).toHaveValue('daily')
    expect(screen.getByText('Every day')).toBeInTheDocument()
    expect(screen.getAllByRole('option').slice(0, 6).map((o) => o.textContent)).toEqual([
      'Daily',
      'Monthly',
      'Yearly',
      'Custom…',
      'Start of every week, rondeled into that week',
      'Start of every month, rondeled into that month',
    ])
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'monthly' } })
    expect(screen.getByText('Every month on the 19th')).toBeInTheDocument()
  })

  it('builds a custom "every 2 weeks on Mon and Thu"', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Every'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'week' } })
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

  it('builds "every month on the 1st and 19th" from the date toggles', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'month' } })
    fireEvent.click(screen.getByRole('button', { name: '1st' }))
    expect(last()).toEqual({
      kind: 'repeat',
      repeat: expect.objectContaining({ unit: 'month', monthly: { type: 'date', days: [1, 19] } }),
    })
    expect(screen.getByText('Every month on the 1st, 19th')).toBeInTheDocument()
  })

  it('still offers the rondel "start of every week/month" rules', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'weekly-start' } })
    expect(last()).toEqual({ kind: 'weekly-start' })
    expect(screen.queryByLabelText('Starts')).not.toBeInTheDocument()
  })

  it('opens with a rule’s pattern when editing', () => {
    setup({ kind: 'repeat', repeat: { unit: 'week', every: 2, weekdays: [1, 4], startDate: '2026-10-05', endDate: null } })
    expect(screen.getByLabelText('Repeats')).toHaveValue('custom')
    expect(screen.getByLabelText('Starts')).toHaveValue('2026-10-05')
    expect(screen.getByRole('button', { name: 'Thursday' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Every 2 weeks on Mon, Thu')).toBeInTheDocument()
  })

  it('opens on a quick choice or a rondel rule', () => {
    setup({ kind: 'monthly-start' })
    expect(screen.getByLabelText('Repeats')).toHaveValue('monthly-start')
  })

  it('moves the end date along when the start passes it', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('End repeat'), { target: { value: 'date' } })
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-11-01' } })
    expect(last()).toEqual({ kind: 'repeat', repeat: expect.objectContaining({ startDate: '2026-11-01', endDate: '2026-11-01' }) })
  })

  it('drops the weekdays when switching Custom to another unit', () => {
    const { last } = setup()
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'week' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thursday' }))
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'day' } })
    expect(last()).toEqual({ kind: 'repeat', repeat: expect.not.objectContaining({ weekdays: expect.anything() }) })
  })
})

