import { expect, test } from '@playwright/test'

// Runs only in the `pages` project: the production build served from /rondel-it/.
test('the Pages build loads every asset under /rondel-it/ and keeps a task after reload', async ({ page }) => {
  const failed: string[] = []
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`) })
  page.on('requestfailed', request => failed.push(`failed ${request.url()}`))

  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  const logo = page.locator('img.sidebar-logo')
  await expect(logo).toHaveAttribute('src', '/rondel-it/icon.svg')
  await expect.poll(() => logo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

  const input = page.getByPlaceholder('Add a task')
  await input.fill('Try the demo')
  await input.press('Enter')
  await expect(page.locator('.task-row', { hasText: 'Try the demo' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.task-row', { hasText: 'Try the demo' })).toBeVisible()
  expect(failed).toEqual([])
})
