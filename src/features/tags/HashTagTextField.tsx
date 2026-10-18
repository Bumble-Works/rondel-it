import type { HashTagTextarea } from './useHashTagInput'
import { HashTagMenu } from './HashTagMenu'
import './HashTagTextField.css'

interface HashTagTextFieldProps {
  /** From `useHashTagInput<HTMLTextAreaElement>()`: the text, picked tags and suggestions. */
  input: HashTagTextarea
  'aria-label': string
  className?: string
  placeholder?: string
  rows?: number
  /** Enter (when it isn't picking a suggestion). */
  onEnter: () => void
  onBlur?: () => void
}

/**
 * A title box where `#` suggests tags: the side panel's title and the
 * recurring form's. Long titles (and links) wrap. Suggestions close when
 * focus leaves, since they float over the page.
 */
export function HashTagTextField({ input, className = '', rows = 2, onEnter, onBlur, ...rest }: HashTagTextFieldProps) {
  return (
    <>
      <textarea
        {...input.inputProps}
        {...rest}
        className={`hashtag-field ${className}`.trim()}
        rows={rows}
        onBlur={() => {
          input.dismiss()
          onBlur?.()
        }}
        onKeyDown={(e) => {
          if (input.handleKey(e)) return
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
      />
      {input.open && <HashTagMenu anchorRef={input.inputRef} options={input.options} highlight={input.highlight} onPick={input.pick} />}
    </>
  )
}
