import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow, Window } from '@tauri-apps/api/window'
import type { RondelTarget } from '../../services/adapters/DataSource'
import type { Task } from '../../domain/types'
import { isDesktopApp } from '../../services/sync/folder'

/**
 * The Mac app's reminder pop-up: a small always-on-top window (label
 * "reminder" in tauri.conf.json). It only shows tasks and reports what was
 * chosen; the main window does the work, so the board and sync stay in charge
 * of the data.
 */
const MAIN = 'main'
const POPUP = 'reminder'

const EVENTS = {
  /** main → pop-up: the reminders to show. */
  show: 'reminders:show',
  /** pop-up → main: it has loaded and wants the current list. */
  ready: 'reminders:ready',
  /** pop-up → main: a choice was made for one task. */
  act: 'reminders:act',
  /** pop-up → main: the window was closed; let them all go. */
  dismiss: 'reminders:dismiss',
} as const

export type ReminderAction = { kind: 'snooze' } | { kind: 'done' } | { kind: 'reschedule'; target: RondelTarget }

export interface ReminderList {
  tasks: Task[]
  weekStartDay: number
}

const logFailure = (what: string) => (e: unknown) => console.error(`[rondel] Reminder pop-up: couldn’t ${what}`, e)

export function isReminderPopup(): boolean {
  return isDesktopApp() && getCurrentWindow().label === POPUP
}

/* ---- main window side ---- */

async function popupWindow(): Promise<Window> {
  const popup = await Window.getByLabel(POPUP)
  if (!popup) throw new Error('the "reminder" window is missing from tauri.conf.json')
  return popup
}

export function sendReminders(list: ReminderList): void {
  emitTo(POPUP, EVENTS.show, list).catch(logFailure('send the reminders'))
}

/** Shows the pop-up on top of whatever app is in front. */
export function showReminderPopup(): void {
  popupWindow()
    .then(async (popup) => {
      await popup.show()
      await popup.setFocus()
    })
    .catch(logFailure('show it'))
}

export function hideReminderPopup(): void {
  popupWindow()
    .then((popup) => popup.hide())
    .catch(logFailure('hide it'))
}

export function listenToReminderPopup(handlers: {
  onReady: () => void
  onAct: (taskId: string, action: ReminderAction) => void
  onDismiss: () => void
}): () => void {
  const unlisteners: Promise<UnlistenFn>[] = [
    listen(EVENTS.ready, () => handlers.onReady()),
    listen<{ taskId: string; action: ReminderAction }>(EVENTS.act, (e) => handlers.onAct(e.payload.taskId, e.payload.action)),
    listen(EVENTS.dismiss, () => handlers.onDismiss()),
  ]
  return () => unlisteners.forEach((p) => void p.then((unlisten) => unlisten()))
}

/** Brings the main window up from hidden or minimized, in front of other apps. */
export async function bringMainWindowToFront(): Promise<void> {
  if (!isDesktopApp()) return
  const main = getCurrentWindow()
  await main.unminimize()
  await main.show()
  await main.setFocus()
}

/* ---- pop-up side ---- */

export function listenForReminders(onList: (list: ReminderList) => void): () => void {
  const window = getCurrentWindow()
  const unlisteners: Promise<UnlistenFn>[] = [
    listen<ReminderList>(EVENTS.show, (e) => onList(e.payload)),
    // The close button only hides the pop-up, so it's ready for the next reminder.
    window.onCloseRequested((e) => {
      e.preventDefault()
      emitTo(MAIN, EVENTS.dismiss).catch(logFailure('report closing'))
    }),
  ]
  // Listen first, then ask: the list sent in reply can't be missed.
  void Promise.all(unlisteners).then(() => emitTo(MAIN, EVENTS.ready).catch(logFailure('ask for the reminders')))
  return () => unlisteners.forEach((p) => void p.then((unlisten) => unlisten()))
}

export function sendReminderAction(taskId: string, action: ReminderAction): void {
  emitTo(MAIN, EVENTS.act, { taskId, action }).catch(logFailure('send the choice'))
}
