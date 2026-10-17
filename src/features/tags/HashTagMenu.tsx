import type { HashTagOption } from './useHashTagInput'
import './HashTagMenu.css'

interface HashTagMenuProps {
  options: HashTagOption[]
  highlight: number
  onPick: (option: HashTagOption) => void
}

export function HashTagMenu({ options, highlight, onPick }: HashTagMenuProps) {
  return (
    <ul className="hashtag-menu" role="listbox" aria-label="Tag suggestions">
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
    </ul>
  )
}
