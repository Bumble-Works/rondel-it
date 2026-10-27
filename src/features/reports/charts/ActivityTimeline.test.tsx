import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReportTimelineDay } from '../../../domain/reportTypes'
import { ActivityTimeline } from './ActivityTimeline'

const days: ReportTimelineDay[] = [
  { date: '2026-10-19', todo: 1, doing: 1, done: 1, rondeled: 1, canceled: 1 },
  { date: '2026-10-20', todo: 2, doing: 2, done: 2, rondeled: 2, canceled: 2 },
]

it('keeps overlapping values exact and lets a legend item reveal its line', () => {
  const { container } = render(<ActivityTimeline days={days} />)
  const points = [...container.querySelectorAll('polyline')].map((line) => line.getAttribute('points'))
  expect(points).toHaveLength(5)
  expect(new Set(points).size).toBe(1)
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Done' }))
  const groups = [...container.querySelectorAll('[data-series]')]
  expect(groups.at(-1)).toHaveAttribute('data-series', 'done')
  expect(container.querySelector('[data-series="todo"]')).toHaveAttribute('opacity', '0.2')
  expect(container.querySelector('[data-series="done"] polyline')).toHaveAttribute('stroke-width', '4')
})

it('shows every value for the focused date, navigates dates by keyboard and toggles lines', () => {
  const { container } = render(<ActivityTimeline days={days} />)
  const chart = screen.getByRole('group', { name: 'Explore daily report values' })
  fireEvent.focus(chart)
  expect(within(screen.getByRole('tooltip')).getByText('Oct 20, 2026')).toBeVisible()
  expect(within(screen.getByRole('tooltip')).getAllByText('2')).toHaveLength(5)
  fireEvent.keyDown(chart, { key: 'Home' })
  expect(within(screen.getByRole('tooltip')).getByText('Oct 19, 2026')).toBeVisible()
  expect(within(screen.getByRole('tooltip')).getAllByText('1')).toHaveLength(5)
  fireEvent.keyDown(chart, { key: 'ArrowRight' })
  expect(within(screen.getByRole('tooltip')).getByText('Oct 20, 2026')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(container.querySelector('[data-series="done"]')).toBeNull()
  expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(container.querySelector('[data-series="done"]')).not.toBeNull()
})

it('keeps the keyboard-selected date when scrolling moves the chart beneath a stationary mouse', () => {
  render(<ActivityTimeline days={days} />)
  const chart = screen.getByRole('group', { name: 'Explore daily report values' })
  const plot = screen.getByRole('img', { name: 'Task activity over time' })
  fireEvent.focus(chart)
  const pointer = new MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 })
  Object.defineProperties(pointer, { pointerType: { value: 'mouse' }, movementX: { value: 0 }, movementY: { value: 0 } })
  fireEvent(plot, pointer)
  expect(within(screen.getByRole('tooltip')).getByText('Oct 20, 2026')).toBeVisible()
  fireEvent.pointerLeave(plot)
  expect(within(screen.getByRole('tooltip')).getByText('Oct 20, 2026')).toBeVisible()
})
