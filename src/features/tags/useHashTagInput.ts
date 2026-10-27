import { useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type SyntheticEvent } from 'react'
import { findTagByName, hashQueryAt, matchTags, removeHashToken } from '../../domain/hashTags'
import type { Tag } from '../../domain/types'

/** 'added': the tag is already on it; shown so you can see that, and picking just clears the #word. */
/** Typing just "#" lists every tag; each letter narrows it down. */
const ALL_TAGS = Number.POSITIVE_INFINITY

export type HashTagOption = { kind: 'tag' | 'added'; tag: Tag } | { kind: 'create'; name: string }

interface Options {
  tags: Tag[]
  /** Creates a tag the user explicitly chose to create; null if it failed. */
  onCreateTag: (name: string) => Promise<Tag | null>
  /** Starting text (e.g. an existing title). */
  initialText?: string
  /** Starting picked tags (e.g. a recurring rule being edited). */
  initialTagIds?: string[]
  /** Tags not to suggest (e.g. already on the task). */
  excludeTagIds?: string[]
  /**
   * Called with each picked tag. Without it, picked tags are collected in
   * `tagIds` (for a task that doesn't exist yet).
   */
  onTag?: (tag: Tag) => void
  /** After any pick, with the text as it is now (the `#word` stripped). */
  onPicked?: (text: string) => void
}

/**
 * Title input where typing `#` suggests tags. Picking one strips the `#word`
 * from the title and attaches the tag. New tags are only created when the
 * user picks "Create"; an unpicked `#word` stays plain text.
 */
export function useHashTagInput<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>({
  tags,
  onCreateTag,
  initialText = '',
  initialTagIds = [],
  excludeTagIds = [],
  onTag,
  onPicked,
}: Options) {
  const inputRef = useRef<E>(null)
  const [text, setText] = useState(initialText)
  const [caret, setCaret] = useState(0)
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds)
  // null = not browsed yet: Enter only auto-picks an existing tag, never "Create".
  const [browsed, setBrowsed] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const query = dismissed ? null : hashQueryAt(text, caret)
  const isAdded = (t: Tag) => tagIds.includes(t.id) || excludeTagIds.includes(t.id)
  const options: HashTagOption[] = query
    ? [
        ...matchTags(tags, query.query, ALL_TAGS).map((tag) => ({ kind: isAdded(tag) ? ('added' as const) : ('tag' as const), tag })),
        ...(query.query && !findTagByName(tags, query.query) ? [{ kind: 'create' as const, name: query.query }] : []),
      ]
    : []
  const open = options.length > 0
  // Enter picks the first existing tag (new or already added), never "Create".
  const highlight = browsed ?? (options[0] && options[0].kind !== 'create' ? 0 : -1)

  // Where the caret goes once the stripped text is on screen. Set right after
  // that render (not a frame later), so quick typing can't land mid-word.
  const pendingCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return
    inputRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [text])

  const pick = async (option: HashTagOption) => {
    if (!query) return
    const tag = option.kind === 'create' ? await onCreateTag(option.name) : option.tag
    if (!tag) return
    const next = removeHashToken(text, query.start, caret)
    setText(next.text)
    setCaret(next.caret)
    pendingCaret.current = next.caret
    if (option.kind === 'added') {
      // Already on it: nothing to add.
    } else if (onTag) onTag(tag)
    else setTagIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
    onPicked?.(next.text)
    setBrowsed(null)
  }

  /** Returns true when the key was used by the suggestions menu. */
  const handleKey = (e: KeyboardEvent<E>): boolean => {
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
    caret,
    replaceText: (value: string, nextCaret: number) => {
      setText(value)
      setCaret(nextCaret)
      pendingCaret.current = nextCaret
    },
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
      onChange: (e: ChangeEvent<E>) => {
        setText(e.target.value)
        setCaret(e.target.selectionStart ?? e.target.value.length)
        setDismissed(false)
        setBrowsed(null)
      },
      onSelect: (e: SyntheticEvent<E>) => setCaret(e.currentTarget.selectionStart ?? 0),
    },
    /** Hides the suggestions (e.g. when the field loses focus); typing again shows them. */
    dismiss: () => setDismissed(true),
    /** Clears the input (or sets it back to `to`) and any picked tags. */
    reset: (to = '') => {
      setText(to)
      setCaret(to.length)
      setTagIds([])
      setDismissed(false)
    },
  }
}

/** A title textarea's hook result, for `HashTagTextField`. */
export type HashTagTextarea = ReturnType<typeof useHashTagInput<HTMLTextAreaElement>>
