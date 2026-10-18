/**
 * Like setInterval, but only while the window is visible: it stops when the
 * app is hidden and runs `fn` right away when it's shown again, to catch up.
 * Returns a cleanup function.
 */
export function startVisibleInterval(fn: () => void, ms: number): () => void {
  let id: number | undefined
  const start = () => {
    if (id === undefined) id = window.setInterval(fn, ms)
  }
  const stop = () => {
    window.clearInterval(id)
    id = undefined
  }
  const onVisibilityChange = () => {
    if (document.hidden) {
      stop()
    } else {
      fn()
      start()
    }
  }

  if (!document.hidden) start()
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
