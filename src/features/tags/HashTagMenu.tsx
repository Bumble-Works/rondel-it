import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { HashTagOption } from './useHashTagInput'
import './HashTagMenu.css'

interface HashTagMenuProps {
  /** The text box it belongs to: the menu opens just below it (or above, if no room). */
  anchorRef: RefObject<HTMLElement | null>
  options: HashTagOption[]
  highlight: number
  onPick: (option: HashTagOption) => void
}

const GAP = 4

/**
 * Rendered over the page (not inside the row), so no section with
 * overflow: hidden can cut it off.
 */
export function HashTagMenu({ anchorRef, options, highlight, onPick }: HashTagMenuProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const anchor = anchorRef.current?.getBoundingClientRect()
      if (!anchor) return
      const height = listRef.current?.offsetHeight ?? 0
      const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - 8
      setPosition({ left: anchor.left, top: fitsBelow ? anchor.bottom + GAP : anchor.top - GAP - height })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchorRef, options.length])

  return createPortal(
    <ul
      ref={listRef}
      className="hashtag-menu"
      role="listbox"
      aria-label="Tag suggestions"
      style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, visibility: position ? 'visible' : 'hidden' }}
      // Clicks anywhere in the menu (even between chips) keep focus in the text
      // box, so it doesn't blur and save the half-typed #word.
      onMouseDown={(e) => e.preventDefault()}
    >
      {options.map((option, index) => (
        <li
          key={option.kind === 'create' ? `create:${option.name}` : option.tag.id}
          role="option"
          aria-selected={index === highlight}
          className={[
            'hashtag-option',
            option.kind === 'create' ? 'hashtag-option--create' : '',
            option.kind === 'added' ? 'is-added' : '',
            index === highlight ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={option.kind === 'create' ? undefined : ({ '--tag': option.tag.color } as CSSProperties)}
          // mousedown, not click: picks before any blur (the list keeps focus too).
          onMouseDown={() => onPick(option)}
        >
          {option.kind === 'create' ? (
            <>Create #{option.name}</>
          ) : (
            <>
              <span className="hashtag-dot" />#{option.tag.name}
              {option.kind === 'added' && <span className="hashtag-added">✓ Added</span>}
            </>
          )}
        </li>
      ))}
    </ul>,
    document.body,
  )
}
