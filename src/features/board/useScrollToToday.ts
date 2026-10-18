import { useEffect } from 'react'

/**
 * Week and Month list the newest day first, so today can be far down. While
 * `enabled` (the shown period contains today), scroll today's section into
 * view whenever `periodKey` changes, i.e. on opening that period.
 */
export function useScrollToToday(enabled: boolean, periodKey: string) {
  useEffect(() => {
    if (!enabled) return
    const frame = requestAnimationFrame(() =>
      document.querySelector('.board-section.is-highlight')?.scrollIntoView({ block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [enabled, periodKey])
}
