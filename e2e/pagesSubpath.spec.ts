import { readFile } from 'node:fs/promises'
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

test('the Pages build downloads a backup from Settings', async ({ page }) => {
  await page.goto('./')
  const input = page.getByPlaceholder('Add a task')
  await input.fill('Keep a copy')
  await input.press('Enter')
  await page.getByRole('button', { name: 'Settings' }).click()

  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const download = await downloaded
  expect(download.suggestedFilename()).toMatch(/^rondel-backup-.+\.json$/)
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8')) as { format: string; version: number }
  expect(backup).toMatchObject({ format: 'rondel-it-backup', version: 1 })
  expect(JSON.stringify(backup)).toContain('Keep a copy')
})
