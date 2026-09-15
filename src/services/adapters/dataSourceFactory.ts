import type { DataSource } from './DataSource'
import { mockDataSource } from './mockDataSource'
import { railsDataSource } from './railsDataSource'

export function createDataSource(): DataSource {
  return import.meta.env.VITE_DATA_SOURCE === 'rails' ? railsDataSource : mockDataSource
}
