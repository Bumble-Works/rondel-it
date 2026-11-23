import { renderWithQuery as render } from './test/queryTestUtils'
import { screen, within } from '@testing-library/react'
import App from './App'
import type { UserSetting } from './domain/types'
import { useSync } from './features/sync/useSync'
import { localDataSource as dataSource } from './services/adapters/localDataSource'
import { reportFixtureTask as task } from './test/reportFixtures'

vi.mock('./features/sync/useSync', () => ({ useSync: vi.fn() }))
vi.mock('./features/reminders/useSchedule', () => ({ useSchedule: vi.fn() }))
vi.mock('./features/board/useScrollToToday', () => ({ useScrollToToday: vi.fn() }))

const HINT = 'Rondeled tasks wait here until you pick a day.'
const settings: UserSetting = {
  weekStartDay: 1, dayStartTime: '09:00', endOfDayTime: '17:00', timezone: 'UTC',
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 8))
  vi.spyOn(dataSource, 'listTags').mockResolvedValue([])
  vi.spyOn(dataSource, 'getSettings').mockImplementation(async () => ({ ...settings }))
  vi.spyOn(dataSource, 'listRecurringRules').mockResolvedValue([])
  vi.spyOn(dataSource, 'syncRecurring').mockResolvedValue()
  vi.spyOn(dataSource, 'listTasksInRange').mockResolvedValue([])
  vi.spyOn(dataSource, 'listBucketTasks').mockResolvedValue([])
  vi.spyOn(dataSource, 'listRondelItems').mockResolvedValue([])
  vi.spyOn(dataSource, 'listUpcomingReminders').mockResolvedValue([])
  vi.spyOn(dataSource, 'listLeftUndone').mockResolvedValue([])
  vi.mocked(useSync).mockReturnValue({
    state: { available: false, folder: null, lastSyncedAt: null, syncing: false, warning: null },
    scheduleSync: vi.fn(), sync: vi.fn(), chooseFolder: vi.fn(), showInFinder: vi.fn(), turnOff: vi.fn(),
  })
})

function rondeledBox(): HTMLElement {
  const box = screen.getByText('Unassigned').closest('section')
  if (!box) throw new Error('No Rondeled box')
  return box
}

describe('Day view Rondeled hint', () => {
  it('explains the Rondeled box while it is empty', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Today' })

    expect(await within(rondeledBox()).findByText(HINT)).toBeInTheDocument()
  })

  it('hides the hint once the box has a task', async () => {
    vi.mocked(dataSource.listRondelItems).mockResolvedValue([
      task({ id: 'waiting', title: 'Waiting task', dayDate: '2026-10-26', rondeled: true }),
    ])
    render(<App />)
    await screen.findByRole('button', { name: 'Open Waiting task' })

    expect(within(rondeledBox()).queryByText(HINT)).not.toBeInTheDocument()
  })
})
