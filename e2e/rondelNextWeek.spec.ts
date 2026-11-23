import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'en-US', timezoneId: 'UTC' })

const row = (page: Page, title: string) => page.locator('.task-row', { hasText: title })

test('Next week puts a scheduled task on next week’s first day, still scheduled', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-28T08:00:00Z')) // Wednesday; weeks start Monday
  await page.goto('/')
  const input = page.getByPlaceholder('Add a task', { exact: true })
  await input.fill('Write the plan')
  await input.press('Enter')

  await row(page, 'Write the plan').getByRole('button', { name: 'Rondel this task' }).click()
  await page.getByRole('menuitem', { name: 'Next week · Monday, November 2', exact: true }).click()
  await expect(row(page, 'Write the plan')).toHaveCount(0)

  for (let day = 0; day < 5; day++) await page.getByRole('button', { name: 'Next day', exact: true }).click()
  await expect(row(page, 'Write the plan')).toBeVisible()

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rondel.v6.tasks') ?? '[]'))
  expect(saved).toEqual([expect.objectContaining({ title: 'Write the plan', dayDate: '2026-11-02', rondeled: false, rondelCount: 1 })])
})
