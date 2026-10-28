import { useMutation } from '@tanstack/react-query'
import type { RefreshData, ReportError } from './useAppData'

export interface MutationServices {
  refresh: RefreshData
  reportError: ReportError
  scheduleSync: () => void
  clearError?: () => void
}

export function useAppMutation<Input, Output>(
  mutationFn: (input: Input) => Promise<Output>,
  context: string,
  services: MutationServices,
  metadata: boolean | ((input: Input) => boolean) = false,
  recurring: boolean | ((input: Input) => boolean) = false,
) {
  const { refresh, reportError, scheduleSync } = services
  const { mutateAsync } = useMutation({
    mutationFn,
    onSuccess: async (_result, input) => {
      services.clearError?.()
      await refresh({
        metadata: typeof metadata === 'function' ? metadata(input) : metadata,
        recurring: typeof recurring === 'function' ? recurring(input) : recurring,
      })
      scheduleSync()
    },
    onError: (error) => reportError(context, error),
  })

  return async (input: Input): Promise<Output | null> => {
    try {
      return await mutateAsync(input)
    } catch {
      // onError logs the failure and surfaces it to the user.
      return null
    }
  }
}
