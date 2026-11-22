import { expect, test } from '@playwright/test'

test('the Demo note stays open while the mouse moves from the label to the download link', async ({ page }) => {
  await page.addInitScript(() => {
    const opened: string[] = []
    ;(window as unknown as { __opened: string[] }).__opened = opened
    window.open = (url?: string | URL) => { opened.push(String(url)); return null }
  })
  await page.goto('/')
  const label = page.getByRole('button', { name: 'Demo' })
  await label.hover()
  const link = page.getByRole('link', { name: 'download the app' })
  await expect(link).toBeVisible()

  const from = (await label.boundingBox())!
  const to = (await link.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await expect(link).toBeVisible()
  await page.mouse.down()
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened))
    .toEqual(['https://github.com/Bumble-Works/rondel-it/releases/latest'])
})
