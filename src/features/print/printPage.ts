import { isDesktopApp } from '../../services/sync/folder'

/**
 * Opens the system print dialog (which also offers "Save as PDF"). The Mac
 * app's web view ignores window.print(), so it asks the native side instead.
 */
export async function printPage(): Promise<void> {
  if (!isDesktopApp()) {
    window.print()
    return
  }
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('print_page')
}
