import { useEffect, useState } from 'react'
import './RecurringTagHint.css'

const SEEN_KEY = 'rondel.ui.recurringTagHintSeen'

function shouldShow(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== 'true'
  } catch (error) {
    console.error('[rondel] Unable to read recurring tag hint preference', error)
    return false
  }
}

/** Mounted only inside an open occurrence picker; subsequent opens stay quiet. */
export function RecurringTagHint() {
  const [visible] = useState(shouldShow)
  useEffect(() => {
    if (!visible) return
    try {
      localStorage.setItem(SEEN_KEY, 'true')
    } catch (error) {
      console.error('[rondel] Unable to remember recurring tag hint was shown', error)
    }
  }, [visible])
  return visible ? <p className="recurring-tag-hint" role="note">Tags apply to this task only. Edit the series in recurring.</p> : null
}
