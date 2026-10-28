import { createElement, type PropsWithChildren, type ReactElement } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createAppQueryClient } from '../services/queries/queryClient'

export function createQueryWrapper() {
  const client = createAppQueryClient()
  // Test clients are discarded with their wrapper; no garbage-collection timers are needed.
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
    mutations: { ...client.getDefaultOptions().mutations, gcTime: Infinity },
  })
  return {
    client,
    wrapper: ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client }, children),
  }
}

export function renderWithQuery(ui: ReactElement) {
  const { client, wrapper } = createQueryWrapper()
  return { ...render(ui, { wrapper }), queryClient: client }
}
