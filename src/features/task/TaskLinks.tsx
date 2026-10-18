import { findLinks } from '../../domain/links'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import './TaskLinks.css'

interface TaskLinksProps {
  /** The task's title and note, as currently being edited. */
  text: string
}

/** Text boxes can't hold clickable links, so the side panel lists them here. */
export function TaskLinks({ text }: TaskLinksProps) {
  const links = [...new Map(findLinks(text).map((l) => [l.href, l])).values()]
  if (links.length === 0) return null
  return (
    <div className="task-links">
      <span className="detail-field-label">Links</span>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <LinkifiedText text={link.text} />
          </li>
        ))}
      </ul>
    </div>
  )
}
