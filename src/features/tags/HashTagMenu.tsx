import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
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
    >
      {options.map((option, index) => (
        <li
          key={option.kind === 'tag' ? option.tag.id : `create:${option.name}`}
          role="option"
          aria-selected={index === highlight}
          className={`hashtag-option ${index === highlight ? 'is-active' : ''}`.trim()}
          // mousedown, not click: keep focus in the input so it doesn't blur-submit.
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(option)
          }}
        >
          {option.kind === 'tag' ? (
            <>
              <span className="hashtag-dot" style={{ background: option.tag.color }} />#{option.tag.name}
            </>
          ) : (
            <span className="hashtag-create">Create #{option.name}</span>
          )}
        </li>
      ))}
    </ul>,
    document.body,
  )
}
