// Shared stack of open modals, oldest first, so Escape only closes the top one
// and callers can tell whether any modal is open (to avoid stacking behind one).
const openModals: symbol[] = []

export function pushModal(id: symbol): void {
  openModals.push(id)
}

export function removeModal(id: symbol): void {
  openModals.splice(openModals.indexOf(id), 1)
}

export function isTopModal(id: symbol): boolean {
  return openModals[openModals.length - 1] === id
}

/** Whether any modal is currently open. */
export function anyModalOpen(): boolean {
  return openModals.length > 0
}
