import { useRef, useState, type ChangeEvent, type KeyboardEvent, type SyntheticEvent } from 'react'
import { findTagByName, hashQueryAt, matchTags, removeHashToken } from '../../domain/hashTags'
import type { Tag } from '../../domain/types'

export type HashTagOption = { kind: 'tag'; tag: Tag } | { kind: 'create'; name: string }

interface Options {
  tags: Tag[]
  /** Creates a tag the user explicitly chose to create; null if it failed. */
  onCreateTag: (name: string) => Promise<Tag | null>
  /** Starting title and tags (e.g. when editing). */
  initialText?: string
  initialTagIds?: string[]
}

/**
 * Title input where typing `#` suggests tags. Picking one strips the `#word`
 * from the title and attaches the tag. New tags are only created when the
 * user picks "Create"; an unpicked `#word` stays plain text.
 */
export function useHashTagInput({ tags, onCreateTag, initialText = '', initialTagIds = [] }: Options) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(initialText)
  const [caret, setCaret] = useState(initialText.length)
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds)
  // null = not browsed yet: Enter only auto-picks an existing tag, never "Create".
  const [browsed, setBrowsed] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const query = dismissed ? null : hashQueryAt(text, caret)
  const available = tags.filter((t) => !tagIds.includes(t.id))
  const options: HashTagOption[] = query
    ? [
        ...matchTags(available, query.query).map((tag) => ({ kind: 'tag' as const, tag })),
        ...(query.query && !findTagByName(tags, query.query) ? [{ kind: 'create' as const, name: query.query }] : []),
      ]
    : []
  const open = options.length > 0
  const highlight = browsed ?? (options[0]?.kind === 'tag' ? 0 : -1)

  const moveCaret = (position: number) =>
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(position, position))

  const pick = async (option: HashTagOption) => {
    if (!query) return
    const tag = option.kind === 'tag' ? option.tag : await onCreateTag(option.name)
    if (!tag) return
    const next = removeHashToken(text, query.start, caret)
    setText(next.text)
    setCaret(next.caret)
    moveCaret(next.caret)
    setTagIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
    setBrowsed(null)
  }

  /** Returns true when the key was used by the suggestions menu. */
  const handleKey = (e: KeyboardEvent<HTMLInputElement>): boolean => {
    if (!open) return false
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key]
    if (step) {
      e.preventDefault()
      setBrowsed((highlight + step + options.length) % options.length)
      return true
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && highlight >= 0) {
      e.preventDefault()
      void pick(options[Math.min(highlight, options.length - 1)])
      return true
    }
    if (e.key === 'Escape') {
      setDismissed(true)
      return true
    }
    return false
  }

  return {
    inputRef,
    text,
    tagIds,
    options,
    open,
    highlight,
    pick,
    handleKey,
    removeTag: (id: string) => setTagIds((ids) => ids.filter((x) => x !== id)),
    toggleTag: (id: string) => setTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])),
    inputProps: {
      ref: inputRef,
      value: text,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value)
        setCaret(e.target.selectionStart ?? e.target.value.length)
        setDismissed(false)
        setBrowsed(null)
      },
      onSelect: (e: SyntheticEvent<HTMLInputElement>) => setCaret(e.currentTarget.selectionStart ?? 0),
    },
    reset: () => {
      setText('')
      setCaret(0)
      setTagIds([])
      setDismissed(false)
    },
  }
}
