import { createDataSource } from './dataSourceFactory'
import { localDataSource } from './localDataSource'
import { railsDataSource } from './railsDataSource'

describe('createDataSource', () => {
  it('returns the local adapter by default', () => {
    vi.stubEnv('VITE_DATA_SOURCE', '')
    expect(createDataSource()).toBe(localDataSource)
  })

  it('returns rails adapter when configured', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'rails')
    expect(createDataSource()).toBe(railsDataSource)
  })
})
