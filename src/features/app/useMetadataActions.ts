import type { UserSetting } from '../../domain/types'
import type { RecurringRuleInput } from '../../services/adapters/DataSource'
import { localDataSource as source } from '../../services/adapters/localDataSource'
import { useAppMutation, type MutationServices } from './useAppMutation'

type TagAction =
  | { type: 'create'; name: string; color?: string }
  | { type: 'update'; id: string; patch: { name?: string; color?: string } }
  | { type: 'delete'; id: string }
type RuleAction =
  | { type: 'create'; input: RecurringRuleInput }
  | { type: 'update'; id: string; input: RecurringRuleInput }
  | { type: 'delete'; id: string }

export function useMetadataActions(services: MutationServices) {
  const tag = useAppMutation(async (action: TagAction) => {
    if (action.type === 'create') return source.createTag({ name: action.name, color: action.color })
    if (action.type === 'update') return source.updateTag(action.id, action.patch)
    await source.deleteTag(action.id)
    return null
  }, 'Unable to save tag', services, true)
  const rule = useAppMutation(async (action: RuleAction) => {
    if (action.type === 'create') return source.createRecurringRule(action.input)
    if (action.type === 'update') return source.updateRecurringRule(action.id, action.input, { applyToOpenTasks: true })
    await source.deleteRecurringRule(action.id)
    return null
  }, 'Unable to save recurring task', services, true)
  const updateSettings = useAppMutation((patch: Partial<UserSetting>) => source.updateSettings(patch), 'Unable to save settings', services, true)

  return {
    createTag: (name: string, color?: string) => tag({ type: 'create', name, color }),
    updateTag: (id: string, patch: { name?: string; color?: string }) => tag({ type: 'update', id, patch }),
    deleteTag: (id: string) => tag({ type: 'delete', id }),
    createRule: (input: RecurringRuleInput) => rule({ type: 'create', input }),
    updateRule: (id: string, input: RecurringRuleInput) => rule({ type: 'update', id, input }),
    deleteRule: (id: string) => rule({ type: 'delete', id }),
    updateSettings,
  }
}
