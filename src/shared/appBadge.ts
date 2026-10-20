import { useEffect } from 'react'
import { isDesktopApp } from '../services/sync/folder'
import { isWindows } from './platform'

/**
 * The red dot on the app's icon (Mac Dock, Windows taskbar), shown while
 * something is prompting: a reminder pop-up or the nag. Each prompt claims it;
 * it clears once none do.
 */
const claims = new Set<string>()
let shown = false

async function setBadge(on: boolean): Promise<void> {
  const [{ getCurrentWindow }, { Image }] = await Promise.all([
    import('@tauri-apps/api/window'),
    import('@tauri-apps/api/image'),
  ])
  const window = getCurrentWindow()
  if (isWindows()) {
    const dot = on ? await Image.fromBytes(await fetch('/badge-dot.png').then((r) => r.arrayBuffer())) : undefined
    await window.setOverlayIcon(dot)
  } else {
    // A dot rather than a count, as for unread items in Slack.
    await window.setBadgeLabel(on ? '•' : undefined)
  }
}

function update() {
  const on = claims.size > 0
  if (on === shown || !isDesktopApp()) return
  shown = on
  setBadge(on).catch((e) => console.error(`[rondel] Couldn’t ${on ? 'show' : 'clear'} the app icon’s red dot`, e))
}

/** Shows the red dot while `prompting` is true. `source` names who's asking. */
export function useAppBadge(source: string, prompting: boolean): void {
  useEffect(() => {
    if (!prompting) return
    claims.add(source)
    update()
    return () => {
      claims.delete(source)
      update()
    }
  }, [source, prompting])
}
