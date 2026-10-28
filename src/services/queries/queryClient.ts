import { QueryClient } from '@tanstack/react-query'

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'always',
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { networkMode: 'always', retry: false },
    },
  })
}

export const appKeys = {
  metadata: ['metadata'] as const,
  tasks: ['tasks'] as const,
  reports: ['tasks', 'reports'] as const,
}
