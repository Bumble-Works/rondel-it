import { useEffect, useState } from 'react'
import { isDesktopApp } from '../../services/sync/folder'
import './StartAtLoginSetting.css'

interface StartAtLoginSettingProps {
  reportError: (context: string, e: unknown) => void
}

/**
 * "Start Rondel It at login". Off by default; it's this Mac's login item, so
 * it's per device and never synced. Started at login, the app opens hidden.
 */
export function StartAtLoginSetting({ reportError }: StartAtLoginSettingProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isDesktopApp()) return
    import('@tauri-apps/plugin-autostart')
      .then(({ isEnabled }) => isEnabled())
      .then(setEnabled)
      .catch((e) => reportError('Couldn’t read the start-at-login setting', e))
  }, [reportError])

  if (!isDesktopApp()) return null

  const toggle = async (on: boolean) => {
    try {
      const autostart = await import('@tauri-apps/plugin-autostart')
      await (on ? autostart.enable() : autostart.disable())
      setEnabled(await autostart.isEnabled())
    } catch (e) {
      reportError('Couldn’t change the start-at-login setting', e)
    }
  }

  return (
    <label className="start-at-login">
      <input
        type="checkbox"
        checked={enabled ?? false}
        disabled={enabled === null}
        onChange={(e) => void toggle(e.target.checked)}
      />
      <span>
        <strong>Start Rondel It at login</strong>
        <small>Opens quietly in the background, so reminders and reviews arrive on time.</small>
      </span>
    </label>
  )
}
