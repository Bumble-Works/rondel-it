import { notify } from '../../shared/notify'
import { bringMainWindowToFront } from './reminderWindow'

/** A review time with things to decide: bring the board (with the nag) to the front, and notify. */
export async function announceReview(slot: 'start' | 'end', count: number): Promise<void> {
  const name = slot === 'start' ? 'Morning review' : 'End-of-day review'
  void notify(name, `${count} ${count === 1 ? 'thing needs' : 'things need'} a decision`)
  await bringMainWindowToFront()
}
