import { expect, test } from '@playwright/test'
import { legacyReportTask, REPORT_NOW, seedReportData, selectFixtureReportDates } from './helpers/reportData.ts'

test.use({ locale: 'en-US', timezoneId: 'UTC' })

const runtimeErrors: string[] = []

async function openReports(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('status')).toHaveCount(0)
  await selectFixtureReportDates(page)
}

test.beforeEach(async ({ page }) => {
  runtimeErrors.length = 0
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await page.clock.setFixedTime(new Date(REPORT_NOW))
})

test.afterEach(() => {
  expect(runtimeErrors, 'Reports must load without browser runtime errors').toEqual([])
})

test('shows dates and progress once per task, with full notes controlled by one toggle', async ({ page }) => {
  await seedReportData(page)
  await openReports(page)
  await expect(page.getByRole('tab')).toHaveCount(2)
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  const table = page.getByRole('table', { name: 'Tasks' })
  await expect(table.getByRole('columnheader')).toHaveText([
    /Task/, /Status/, /First seen/, /Completed/, /Rondels/, /Days in progress/,
  ])
  await expect(table.locator('tbody tr')).toHaveCount(10)
  await expect(table.getByRole('rowheader', { name: /^history-live\b/ })).toHaveCount(1)
  await expect(table.getByRole('rowheader', { name: /^history(?:\s|$)/ })).toHaveCount(0)
  const finished = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /^work-done\b/ }) })
  await expect(finished.getByRole('cell').nth(1)).toHaveText('Oct 17, 2026')
  await expect(finished.getByRole('cell').nth(2)).toHaveText('Oct 21, 2026')
  await expect(finished.getByRole('cell').nth(4)).toHaveText('3 days')
  const active = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /^history-live\b/ }) })
  await expect(active.getByRole('cell').nth(2)).toHaveText('—')
  await expect(active.getByRole('cell').nth(4)).toHaveText('11 days')
  await expect(active.getByText('Review feedback applied.')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Show notes' }).check()
  await expect(active.getByText('Review feedback applied.')).toBeVisible()
  await expect(finished).toContainText('Client update shipped.')
  await expect(finished).toContainText('Ready for the manager review.')
  await expect(table.locator('details')).toHaveCount(0)
  await expect(table.getByText(/Scheduled for|Estimated from/)).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Show notes' }).uncheck()
  await expect(active.getByText('Review feedback applied.')).toHaveCount(0)
})

test('sorts in both directions and combines status pills including canceled', async ({ page }) => {
  await seedReportData(page)
  await openReports(page)
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  const table = page.getByRole('table', { name: 'Tasks' })
  await page.getByRole('button', { name: 'Sort by Task', exact: true }).click()
  await expect(table.getByRole('rowheader').first()).toContainText('brought-in')
  await expect(table.getByRole('columnheader').filter({ has: page.getByRole('button', { name: 'Sort by Task', exact: true }) })).toHaveAttribute('aria-sort', 'ascending')
  await page.getByRole('button', { name: 'Sort by Task', exact: true }).click()
  await expect(table.getByRole('rowheader').first()).toContainText('work-done')
  await page.getByRole('button', { name: 'Sort by Days in progress', exact: true }).click()
  await expect(table.getByRole('rowheader').first()).toContainText('history-live')
  const statuses = page.getByRole('group', { name: 'Filter tasks by status' })
  await statuses.getByRole('button', { name: 'Canceled', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await expect(table.getByRole('rowheader')).toContainText('canceled')
  await statuses.getByRole('button', { name: 'Completed', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(5)
  await statuses.getByRole('button', { name: 'All statuses' }).click()
  await expect(table.locator('tbody tr')).toHaveCount(10)
})

test('filters legacy and recorded cancellations by any/all tags', async ({ page }) => {
  await seedReportData(page, [
    { ...legacyReportTask(), id: 'work-cancel', title: 'Work canceled', status: 'canceled', dayDate: '2026-10-26', completedAt: null, tagIds: ['work'] },
    { ...legacyReportTask(), id: 'fitness-cancel', title: 'Fitness canceled', status: 'canceled', dayDate: '2026-11-02', completedAt: null, canceledAt: '2026-10-26T12:00:00Z', tagIds: ['fitness'] },
    { ...legacyReportTask(), id: 'shared-cancel', title: 'Shared canceled', status: 'canceled', dayDate: '2026-10-25', completedAt: null, tagIds: ['work', 'fitness'] },
  ])
  await openReports(page)
  const canceled = page.locator('.report-highlight').filter({ has: page.getByText('Canceled', { exact: true }) }).locator('strong')
  await expect(canceled).toHaveText('3')
  await page.getByRole('button', { name: '#work', exact: true }).click()
  await expect(canceled).toHaveText('2')
  await page.getByRole('button', { name: '#fitness', exact: true }).click()
  await expect(canceled).toHaveText('3')
  await page.getByRole('combobox', { name: 'Match', exact: true }).selectOption('all')
  await expect(canceled).toHaveText('1')
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  const row = page.getByRole('table', { name: 'Tasks' }).locator('tbody tr')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Shared canceled')
  await expect(row.locator('.chip')).toHaveText(['work', 'fitness'])
})

test('opens left-behind todos for action and celebrates a clear list', async ({ page }) => {
  await seedReportData(page)
  await openReports(page)
  await expect(page.locator('.report-highlights > .report-highlight > span')).toHaveText([
    'To do', 'In progress', 'Done', 'Rondeled', 'Canceled', 'Left behind',
  ])
  await expect(page.locator('.report-highlights .chip')).toHaveCount(0)
  await expect(page.getByText('🧭 Needs some attention', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show 1 task left behind' }).click()
  await expect(page.getByRole('tab', { name: 'Tasks', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Left behind', exact: true })).toBeVisible()
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('rowheader')).toContainText('brought-in')
  await page.getByRole('button', { name: 'Show all tasks' }).click()
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(10)
  await page.getByRole('tab', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: '#fitness', exact: true }).click()
  await expect(page.getByText('🌟 All clear nicely done', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show 0 tasks left behind' })).toBeDisabled()
  await page.getByRole('button', { name: 'All tags', exact: true }).click()
  await page.getByRole('button', { name: 'Show 1 task left behind' }).click()
  await page.getByRole('button', { name: 'Open brought-in', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Task details' })).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('brought-in')
})

test('shares any/all tags and date filters between the dashboard and tasks', async ({ page }) => {
  await seedReportData(page)
  await openReports(page)
  await page.getByRole('button', { name: '#work', exact: true }).click()
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  const table = page.getByRole('table', { name: 'Tasks' })
  await expect(table.locator('tbody tr')).toHaveCount(7)
  await page.getByRole('button', { name: '#fitness', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(9)
  await page.getByRole('combobox', { name: 'Match', exact: true }).selectOption('all')
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await expect(table.getByRole('rowheader')).toContainText('shared-done')
  await page.getByRole('tab', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Match', exact: true })).toHaveValue('all')
  await expect(page.getByRole('region', { name: 'Task status by tag', exact: true })).toContainText('#work')
  await expect(page.getByRole('region', { name: 'Task status by tag', exact: true })).toContainText('#fitness')
  await page.getByRole('combobox', { name: 'Period', exact: true }).selectOption('custom')
  await page.getByLabel('From', { exact: true }).fill('2026-10-27')
  await page.getByLabel('Through', { exact: true }).fill('2026-10-27')
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('table')).toHaveCount(0)
})

test('keeps an unstarted legacy fitness task visible after pushing it beyond the report', async ({ page }) => {
  await seedReportData(page, [
    { ...legacyReportTask(), id: 'pilates', title: 'Pilates class', status: 'todo', tagIds: ['fitness'],
      dayDate: '2026-10-28', originDate: '2026-10-13', createdAt: '2026-10-13T08:00:00Z', completedAt: null, rondelCount: 14 },
    { ...legacyReportTask(), id: 'shipped', title: 'Shipped a project', tagIds: ['work'], rondelCount: 0 },
  ])
  await openReports(page)
  const completion = page.locator('.report-section').filter({ has: page.getByRole('heading', { name: 'Completion by tag', exact: true }) })
  await expect(completion.getByLabel('#work: 1 done', { exact: true })).toBeAttached()
  await expect(completion.getByLabel('#fitness: 1 to do', { exact: true })).toHaveCount(0)
  const rolling = page.locator('.report-section').filter({ has: page.getByRole('heading', { name: 'Where tasks keep rolling', exact: true }) })
  await expect(rolling.getByLabel('#fitness: 14 rondels', { exact: true })).toBeAttached()
  await expect(page.getByRole('heading', { name: 'Where your attention went', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '#fitness', exact: true }).click()
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  const row = page.getByRole('table').getByRole('row').filter({ hasText: 'Pilates class' })
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell').nth(1)).toHaveText('Oct 13, 2026')
  await expect(row.getByRole('cell').nth(2)).toHaveText('—')
  await expect(row.getByRole('cell').nth(3)).toHaveText('14')
  await expect(row.getByRole('cell').nth(4)).toHaveText('—')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rondel.v6.tasks') ?? '[]'))
  expect(saved.find((task: { id: string }) => task.id === 'pilates').startedAt ?? null).toBeNull()
})

test('supports keyboard tabs and contains the table in a narrow window', async ({ page }) => {
  await seedReportData(page)
  await openReports(page)
  await page.getByRole('tab', { name: 'Dashboard', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Tasks', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel', { name: 'Tasks', exact: true })).toBeVisible()
  await page.keyboard.press('Home')
  await expect(page.getByRole('tab', { name: 'Dashboard', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await page.setViewportSize({ width: 360, height: 800 })
  const scrolling = page.getByRole('region', { name: 'Scrollable task details' })
  await expect(scrolling).toBeVisible()
  expect(await scrolling.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('group', { name: 'Filter tasks by status' }).getByRole('button', { name: 'Completed', exact: true }).click()
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(4)
})

test.describe('device timezone dates', () => {
  test.use({ timezoneId: 'Asia/Jerusalem' })
  test('shows First seen on the local creation day after midnight across a task chain', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-27T02:55:00Z'))
    await seedReportData(page, [
      { ...legacyReportTask(), id: 'original', title: 'Original task', status: 'doing', completedAt: null, dayDate: '2026-10-26',
        originDate: '2026-10-26', createdAt: '2026-10-26T23:30:00Z', startedAt: '2026-10-26T23:45:00Z', carriedToId: 'live' },
      { ...legacyReportTask(), id: 'live', title: 'Local date task', status: 'doing', completedAt: null, dayDate: '2026-10-27',
        originDate: '2026-10-26', createdAt: '2026-10-27T02:00:00Z', startedAt: '2026-10-26T23:45:00Z', originTaskId: 'original', previousTaskId: 'original' },
    ])
    await openReports(page)
    await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
    const row = page.getByRole('table', { name: 'Tasks' }).locator('tbody tr')
    await expect(row).toHaveCount(1)
    await expect(row.getByRole('cell').nth(1)).toHaveText('Oct 27, 2026')
    await expect(row.getByRole('cell').nth(4)).toHaveText('0 days')
  })
})
