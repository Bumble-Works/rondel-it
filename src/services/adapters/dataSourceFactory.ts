import type { DataSource } from './DataSource'
import { localDataSource } from './localDataSource'
import { railsDataSource } from './railsDataSource'

export function createDataSource(): DataSource {
  return import.meta.env.VITE_DATA_SOURCE === 'rails' ? railsDataSource : localDataSource
}
