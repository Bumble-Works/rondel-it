import { expect, test, type Page } from '@playwright/test'
import { legacyReportTask, REPORT_NOW, seedReportData, selectFixtureReportDates } from './helpers/reportData.ts'

test.use({ locale: 'en-US', timezoneId: 'UTC' })
const errors: string[] = []
const section = (page: Page, title: string) => page.locator('.report-section')
  .filter({ has: page.getByRole('heading', { name: title, exact: true }) })

async function openReports(page: Page) {
  const menu = page.getByRole('button', { name: 'Show sidebar' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
  await selectFixtureReportDates(page)
}

test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.setFixedTime(new Date(REPORT_NOW))
})

test.afterEach(() => expect(errors, 'Reports must not trigger browser runtime errors').toEqual([]))

test('explains every overview count and matches distinct chip colors to timeline lines', async ({ page }) => {
  await seedReportData(page)
  await page.goto('/')
  await openReports(page)
  const cards = page.locator('.report-highlight')
  await expect(cards).toHaveCount(6)
  const backgrounds = await cards.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))
  expect(new Set(backgrounds).size).toBe(6)
  for (const [label, key] of [['To do', 'todo'], ['In progress', 'doing'], ['Done', 'done'], ['Rondeled', 'rondeled'], ['Canceled', 'canceled']]) {
    const card = cards.filter({ has: page.getByText(label, { exact: true }) })
    await expect(card).toHaveAttribute('title', /.+/)
    const color = await card.evaluate((element) => getComputedStyle(element).getPropertyValue('--report-color').trim())
    await expect(page.locator(`[data-series="${key}"] polyline`)).toHaveAttribute('stroke', color)
    const caption = await card.locator('small').innerText()
    expect([...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(caption)].length).toBeLessThanOrEqual(25)
    expect(caption).not.toMatch(/[.!?]/)
    if (key === 'rondeled') {
      const icon = card.locator('small img')
      await expect(icon).toHaveAttribute('src', '/icon.svg')
      await expect.poll(() => icon.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
    } else expect(caption).toMatch(/^\p{Extended_Pictographic}/u)
  }
  const leftBehind = cards.filter({ has: page.getByText('Left behind', { exact: true }) })
  await expect(leftBehind).toHaveAttribute('title', 'Unfinished to-dos still dated in the past.')
  await expect(leftBehind.getByRole('button')).toHaveAccessibleDescription('Unfinished to-dos still dated in the past.')
})

test('stacks the bottom cards in a narrow window and collapses them independently', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await seedReportData(page)
  await page.goto('/')
  await openReports(page)
  const duration = section(page, 'From started to completed')
  const bucket = section(page, 'Bucket List')
  const outcomes = section(page, 'Where your rondeled items went')
  const durationBox = (await duration.boundingBox())!
  const bucketBox = (await bucket.boundingBox())!
  const outcomesBox = (await outcomes.boundingBox())!
  expect(Math.abs(durationBox.x - outcomesBox.x)).toBeLessThanOrEqual(1)
  expect(bucketBox.y).toBeGreaterThanOrEqual(durationBox.y + durationBox.height)
  expect(outcomesBox.y).toBeGreaterThanOrEqual(bucketBox.y + bucketBox.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(bucket.getByRole('definition')).toHaveText(['2', '1'])
  await outcomes.getByRole('button').click()
  await expect(outcomes.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  expect((await outcomes.boundingBox())!.height).toBeLessThan(outcomesBox.height)
  await expect(bucket.getByRole('definition')).toHaveText(['2', '1'])
  await outcomes.getByRole('button').focus()
  await page.keyboard.press('Space')
  await expect(outcomes.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  await expect(outcomes.locator('.rondel-outcomes')).toBeVisible()
})

test('pages through more than fifty task chains and resets the page after filtering or sorting', async ({ page }) => {
  await seedReportData(page, Array.from({ length: 55 }, (_, index) => ({
    ...legacyReportTask(), id: `task-${index}`, title: `Task ${String(index).padStart(2, '0')}`,
    status: 'todo', completedAt: null, rondelCount: 0, tagIds: index < 3 ? ['work'] : [],
  })))
  await page.goto('/')
  await openReports(page)
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  const table = page.getByRole('table', { name: 'Tasks' })
  const pager = page.getByRole('navigation', { name: 'Task table pages' })
  await expect(table.locator('tbody tr')).toHaveCount(50)
  await expect(pager).toContainText('1–50 of 55 tasks')
  await pager.getByRole('button', { name: 'Next page' }).click()
  await expect(table.locator('tbody tr')).toHaveCount(5)
  await expect(pager).toContainText('51–55 of 55 tasks')
  await page.getByRole('button', { name: '#work', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(3)
  await expect(pager).toContainText('1–3 of 3 tasks')
  await page.getByRole('button', { name: 'All tags', exact: true }).click()
  await expect(pager).toContainText('1–50 of 55 tasks')
  await pager.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Sort by Task', exact: true }).click()
  await expect(table.getByRole('rowheader').first()).toContainText('Task 00')
  await expect(pager).toContainText('1–50 of 55 tasks')
})

test.describe('local midnight movement dates', () => {
  test.use({ timezoneId: 'Asia/Jerusalem' })
  test('dates rondels and Bucket List actualization by the recorded local action day', async ({ page }) => {
    const occurredAt = '2026-10-26T23:30:00Z'
    await seedReportData(page, [
      { ...legacyReportTask(), id: 'moved', status: 'todo', dayDate: '2026-11-15', completedAt: null, rondelCount: 1,
        rondelHistory: [{ id: 'move', occurredAt, fromDate: '2026-10-01', toDate: '2026-11-15',
          fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: null, status: 'todo' }] },
      { ...legacyReportTask(), id: 'dream', status: 'todo', dayDate: '2026-11-15', completedAt: null, rondelCount: 0,
        createdAt: '2026-10-25T23:30:00Z', originDate: '2026-11-15', bucketListOrigin: true, tagIds: ['fitness'],
        bucketHistory: [{ id: 'added', kind: 'added', occurredAt: '2026-10-25T23:30:00Z' },
          { id: 'scheduled', kind: 'scheduled', occurredAt }] },
    ])
    await page.goto('/')
    await openReports(page)
    const from = page.getByLabel('From', { exact: true })
    const through = page.getByLabel('Through', { exact: true })
    await from.fill('2026-10-27')
    await through.fill('2026-10-27')
    const bucket = section(page, 'Bucket List')
    await expect(bucket.getByRole('definition')).toHaveText(['0', '1'])
    await expect(bucket.getByText('You’re making someday happen!')).toBeVisible()
    const chart = page.getByRole('group', { name: 'Explore daily report values' })
    await chart.focus()
    await expect(page.getByRole('tooltip').locator('dd')).toHaveText(['0', '0', '0', '1', '0'])
    await from.fill('2026-10-26')
    await through.fill('2026-10-26')
    await expect(bucket.getByRole('definition')).toHaveText(['1', '0'])
    await expect(bucket.getByText('More to look forward to!')).toBeVisible()
    await chart.focus()
    await expect(page.getByRole('tooltip').locator('dd')).toHaveText(['0', '0', '0', '0', '0'])
    await page.getByRole('button', { name: '#work', exact: true }).click()
    await expect(bucket.getByRole('definition')).toHaveText(['0', '0'])
    await expect(bucket.locator('.bucket-activity-feedback')).toHaveCount(0)
  })
})
