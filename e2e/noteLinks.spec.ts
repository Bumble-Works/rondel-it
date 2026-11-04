import { expect, test } from '@playwright/test'

for (const width of [360, 1280]) {
  test(`reads note links and separates reminder at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    const input = page.getByPlaceholder('Add a task', { exact: true })
    await input.fill('Link notes')
    await input.press('Enter')
    await page.getByRole('button', { name: 'Open Link notes', exact: true }).click()
    const panel = page.getByRole('complementary', { name: 'Task details' })
    await panel.getByLabel('Note', { exact: true }).fill('First https://example.com\nSecond www.example.org')
    await panel.getByLabel('Note', { exact: true }).press('Tab')
    await expect(panel.locator('.task-note-reading').getByRole('link')).toHaveCount(2)
    await expect(panel.locator('.task-links').getByRole('link')).toHaveCount(2)
    const margin = await panel.locator('.task-links').evaluate(el => parseFloat(getComputedStyle(el).marginBottom))
    expect(margin).toBeGreaterThanOrEqual(12)
    await panel.getByRole('button', { name: 'Edit note' }).click()
    await expect(panel.getByLabel('Note', { exact: true })).toHaveValue('First https://example.com\nSecond www.example.org')
  })
}
