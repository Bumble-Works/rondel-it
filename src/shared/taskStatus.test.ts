import { toggleStatusFilter } from './taskStatus'

it('shares status selection behavior between board and reports, including canceled and All', () => {
  const selected = ['todo'] as const
  expect(toggleStatusFilter([...selected], 'done')).toEqual(['todo', 'done'])
  expect(toggleStatusFilter(['canceled'], 'canceled')).toEqual([])
  expect(toggleStatusFilter(['todo', 'doing', 'done'], 'canceled')).toEqual([])
  expect(toggleStatusFilter([], 'canceled')).toEqual(['canceled'])
  expect(selected).toEqual(['todo'])
})
