import type { Tag, Task } from '../../domain/types'
import { HashTagTextField } from '../tags/HashTagTextField'
import { useHashTagInput } from '../tags/useHashTagInput'

interface TaskTitleFieldProps {
  task: Task
  allTags: Tag[]
  onChangeTitle: (title: string) => void
  /** Attaches a tag to the task. */
  onAddTag: (tagId: string) => void
  createTag: (name: string) => Promise<Tag | null>
}

/**
 * The side panel's title. Typing `#` suggests tags, like "Add a task": picking
 * one attaches it now and strips the `#word`; the title saves on blur/Enter.
 */
export function TaskTitleField({ task, allTags, onChangeTitle, onAddTag, createTag }: TaskTitleFieldProps) {
  const input = useHashTagInput<HTMLTextAreaElement>({
    tags: allTags,
    onCreateTag: createTag,
    initialText: task.title,
    excludeTagIds: task.tagIds,
    onTag: (tag) => onAddTag(tag.id),
    // Save the stripped title now, so the board row never keeps the `#word`
    // (e.g. if a click on the menu briefly took focus and saved it).
    onPicked: (text) => {
      const next = text.trim()
      if (next && next !== task.title) onChangeTitle(next)
    },
  })

  const commit = () => {
    const next = input.text.trim()
    if (next && next !== task.title) onChangeTitle(next)
    else if (!next) input.reset(task.title)
  }

  return (
    <HashTagTextField
      input={input}
      className="detail-title"
      aria-label="Title"
      onBlur={commit}
      onEnter={() => input.inputRef.current?.blur()}
    />
  )
}
