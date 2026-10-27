import { fireEvent, render, screen, within } from '@testing-library/react'
import { CountBars } from './CountBars'

it('exposes every duration bucket count, including small and empty buckets', async () => {
  render(<CountBars label="Time to completion" data={[
    { label: 'Same day', count: 100 }, { label: '1–2 days', count: 1 }, { label: '3–7 days', count: 0 },
  ]} />)
  const chart = screen.getByRole('group', { name: 'Time to completion' })
  for (const label of ['Same day: 100 tasks', '1–2 days: 1 task', '3–7 days: 0 tasks']) {
    expect(within(chart).getByLabelText(label)).toHaveAttribute('tabindex', '0')
  }
  const smallBucket = within(chart).getByLabelText('1–2 days: 1 task')
  fireEvent.focus(smallBucket)
  expect(await screen.findByRole('tooltip')).toHaveTextContent('1–2 days1 task')
  fireEvent.blur(smallBucket)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.mouseEnter(smallBucket)
  expect(await screen.findByRole('tooltip')).toHaveTextContent('1–2 days1 task')
})
