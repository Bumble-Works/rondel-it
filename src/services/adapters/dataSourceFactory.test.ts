import { createDataSource } from './dataSourceFactory'
import { mockDataSource } from './mockDataSource'
import { railsDataSource } from './railsDataSource'

describe('createDataSource', () => {
  it('returns mock adapter by default', () => {
    vi.stubEnv('VITE_DATA_SOURCE', '')
    expect(createDataSource()).toBe(mockDataSource)
  })

  it('returns rails adapter when configured', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'rails')
    expect(createDataSource()).toBe(railsDataSource)
  })
})
