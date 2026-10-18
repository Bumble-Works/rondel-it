import type { Tag, Task } from '../../domain/types'
import { HashTagMenu } from '../tags/HashTagMenu'
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
  })

  const commit = () => {
    // The suggestions float over the page, so they must close when focus leaves.
    input.dismiss()
    const next = input.text.trim()
    if (next && next !== task.title) onChangeTitle(next)
    else if (!next) input.reset(task.title)
  }

  return (
    <>
      <textarea
        {...input.inputProps}
        className="detail-title"
        aria-label="Title"
        rows={2}
        onBlur={commit}
        onKeyDown={(e) => {
          if (input.handleKey(e)) return
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
      {input.open && (
        <HashTagMenu anchorRef={input.inputRef} options={input.options} highlight={input.highlight} onPick={input.pick} />
      )}
    </>
  )
}
