import { linkLabel, splitLinks } from '../../domain/links'
import { openExternal } from '../openExternal'
import './LinkifiedText.css'

interface LinkifiedTextProps {
  text: string
}

/**
 * Text with its web links clickable. Clicking a link only opens it (in the
 * default browser); it doesn't also trigger whatever the surrounding row does.
 */
export function LinkifiedText({ text }: LinkifiedTextProps) {
  return (
    <>
      {splitLinks(text).map((part, index) =>
        part.kind === 'text' ? (
          part.text
        ) : (
          <a
            key={index}
            className="linkified"
            href={part.href}
            // Cmd/middle-click skip onClick and open the href directly: keep
            // that path as safe as openExternal (no opener, no referrer).
            target="_blank"
            rel="noopener noreferrer"
            title={part.href}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openExternal(part.href).catch((err) => console.error('[rondel] Couldn’t open link', err))
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {linkLabel(part.text)}
          </a>
        ),
      )}
    </>
  )
}
