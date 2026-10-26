import type { CreateTaskInput } from '../../services/adapters/DataSource'
import type { BoardGroupAddTarget } from '../board/WeekBoard'

/** Shared mapping for all quick-add entry points to keep behavior in sync. */
export function toQuickAddCreateTaskInput(
  target: BoardGroupAddTarget,
  title: string,
  tagIds: string[],
  activeTagIds: string[],
): CreateTaskInput {
  return {
    title,
    dayDate: target.dayDate ?? null,
    rondeled: target.rondeled ?? false,
    bucket: target.bucket ?? null,
    tagIds: [...new Set([...activeTagIds, ...tagIds])],
  }
}
