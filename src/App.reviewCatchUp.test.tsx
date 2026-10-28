import { renderWithQuery as render } from './test/queryTestUtils'
import { screen } from '@testing-library/react'
import App from './App'
import type { Task } from './domain/types'

// The nag brings the window to the front; that's a desktop side effect, not the
// behavior under test, so stub it to keep the test to the nag opening.
vi.mock('./features/reminders/announceReview', () => ({
  announceReview: vi.fn(async () => {}),
}))

function seedWaitingRondeledTask() {
  const task: Task = {
    id: 'waiting-1',
    title: 'Parked for this week',
    status: 'todo',
    // Rondeled to this week (Mon 2026-10-19); its period has already started,
    // so it's waiting for a decision as of "today" (2026-10-22).
    dayDate: '2026-10-19',
    rondeled: true,
    bucket: null,
    position: 0,
    rondelCount: 1,
    doingRondelCount: null, startedAt: null, bucketListOrigin: null, canceledAt: null, rondelHistory: [],
    flagged: false,
    reminderTime: null,
    originDate: '2026-10-19',
    originTaskId: null,
    previousTaskId: null,
    carriedToId: null,
    tagIds: [],
    note: '',
    createdAt: '2026-10-19T08:00:00.000Z',
    completedAt: null,
    recurringRuleId: null,
  }
  localStorage.setItem('rondel.v6.tasks', JSON.stringify([task]))
}

describe('App review catch-up on open', () => {
  beforeEach(() => {
    // shouldAdvanceTime lets the board's async loads and the schedule's timers
    // settle while Date stays pinned to the afternoon open.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // Thu 2026-10-22, 14:00 local: past the 09:00 morning review, before 17:00.
    vi.setSystemTime(new Date(2026, 9, 22, 14, 0, 0))
    seedWaitingRondeledTask()
  })

  it('opens the nag for a missed morning review even though the board loads after the review fires', async () => {
    render(<App />)

    // The morning review fires synchronously on open, before the async board
    // load knows the count; the nag must still open once the data arrives.
    const nag = await screen.findByRole('dialog', { name: 'Don’t lose these' })
    expect(nag).toHaveTextContent('Parked for this week')
  })
})
