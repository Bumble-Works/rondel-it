import { render, screen, within } from '@testing-library/react'
import type { ReportTagMetric } from '../../../domain/reportTypes'
import { TagBars } from './TagBars'

const metrics: ReportTagMetric[] = ['Project migration frontend', 'Project migration backend'].map((name, index) => ({
  id: `tag-${index}`, name, color: '#5486f5', total: 1, done: 1,
  inProgress: 0, todo: 0, canceled: 0, rondels: index + 1,
}))

it.each(['completion', 'rondels'] as const)('prints a numbered key with complete names for %s bars', (kind) => {
  const { container } = render(<TagBars metrics={metrics} kind={kind} printMode />)
  const key = screen.getByRole('list')
  const names = within(key).getAllByRole('listitem').map((item) => item.textContent)
  expect(new Set(names)).toEqual(new Set(metrics.map((tag) => `#${tag.name}`)))
  expect(names).toHaveLength(2)
  const axes = [...container.querySelectorAll('svg text')].map((node) => node.textContent)
  expect(axes).toContain('1')
  expect(axes).toContain('2')
  expect(axes.some((label) => label?.includes('…'))).toBe(false)
})

it('continues the printed key across groups in the same order as the bars', () => {
  const many = Array.from({ length: 14 }, (_, index) => ({ ...metrics[0], id: `tag-${index}`,
    name: `Project ${index}`, rondels: index + 1 }))
  const { container } = render(<TagBars metrics={many} kind="rondels" printMode />)
  const keys = screen.getAllByRole('list')
  expect(keys).toHaveLength(2)
  expect(keys[0]).toHaveAttribute('start', '1')
  expect(keys[1]).toHaveAttribute('start', '13')
  expect(within(keys[1]).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['#Project 1', '#Project 0'])
  const axes = [...container.querySelectorAll('.tag-bars-page:last-child svg text')].map((node) => node.textContent)
  expect(axes).toContain('13')
  expect(axes).toContain('14')
})

it('retains shortened names and no numbered key on screen', () => {
  const { container } = render(<TagBars metrics={metrics} kind="completion" />)
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  const axes = [...container.querySelectorAll('svg text')].map((node) => node.textContent)
  expect(axes.filter((label) => label === '#Project migrat…')).toHaveLength(2)
})
