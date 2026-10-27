import { useState, type KeyboardEvent } from 'react'
import { removeHashToken } from '../../domain/hashTags'
import type { Tag } from '../../domain/types'
import { ensureNotificationPermission } from '../../shared/notify'
import { useHashTagInput } from '../tags/useHashTagInput'
import { timeTokenAt } from './timeToken'

export function useTaskCapture(tags: Tag[], onCreateTag: (name: string) => Promise<Tag | null>, canSetTime: boolean) {
  const input = useHashTagInput({ tags, onCreateTag })
  const [time, setTime] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const suggestion = canSetTime && dismissed !== input.text ? timeTokenAt(input.text, input.caret) : null
  const changeTime = (value: string | null) => {
    setTime(value)
    if (value) void ensureNotificationPermission()
  }
  const pickTime = () => {
    if (!suggestion) return
    changeTime(suggestion.time)
    const next = removeHashToken(input.text, suggestion.start, input.caret)
    input.replaceText(next.text, next.caret)
    input.inputRef.current?.focus()
  }
  return {
    ...input,
    time: canSetTime ? time : null,
    changeTime,
    suggestion,
    pickTime,
    handleKey: (e: KeyboardEvent<HTMLInputElement>) => {
      if (input.handleKey(e)) return true
      if (!suggestion) return false
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickTime()
        return true
      }
      if (e.key === 'Escape') {
        setDismissed(input.text)
        return true
      }
      return false
    },
    reset: () => { input.reset(); setTime(null); setDismissed(null) },
  }
}
