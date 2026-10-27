import type { Tag } from '../../domain/types'
import { TagChip } from '../../shared/ui/TagChip'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import './ReportContext.css'

export function ReportContext({ tagIds, tags, note }: { tagIds: string[]; tags: Tag[]; note?: string }) {
  const attached = tagIds.flatMap((id) => {
    const tag = tags.find((item) => item.id === id)
    return tag ? [tag] : []
  })
  if (!attached.length && !note) return null
  return (
    <div className="report-context">
      {attached.length > 0 && <div className="report-context-tags" aria-label="Tags">
        {attached.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" />)}
      </div>}
      {note && <p className="report-context-note"><LinkifiedText text={note} /></p>}
    </div>
  )
}
