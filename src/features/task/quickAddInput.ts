import type { CreateTaskInput } from '../../services/adapters/DataSource'
import type { BoardGroupAddTarget } from '../board/WeekBoard'

/** Shared mapping for all quick-add entry points to keep behavior in sync. */
export function toQuickAddCreateTaskInput(
  target: BoardGroupAddTarget,
  title: string,
  tagIds: string[],
  activeTagIds: string[],
  reminderTime: string | null = null,
): CreateTaskInput {
  return {
    title,
    dayDate: target.dayDate ?? null,
    rondeled: target.rondeled ?? false,
    bucket: target.bucket ?? null,
    tagIds: [...new Set([...activeTagIds, ...tagIds])],
    ...(reminderTime && target.dayDate && !target.rondeled && !target.bucket ? { reminderTime } : {}),
  }
}
