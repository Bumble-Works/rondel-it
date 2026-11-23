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
  const to = await link.evaluate(el => { const r = el.getClientRects()[0]; return { x: r.x, y: r.y, width: r.width, height: r.height } })
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await expect(link).toBeVisible()
  await page.mouse.down()
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened))
    .toEqual(['https://github.com/Bumble-Works/rondel-it/releases/latest'])
})

test.describe('on a touchscreen', () => {
  test.use({ hasTouch: true })

  test('tapping Demo opens the note, the download link can be tapped, and tapping outside closes it', async ({ page }) => {
    await page.addInitScript(() => {
      const opened: string[] = []
      ;(window as unknown as { __opened: string[] }).__opened = opened
      window.open = (url?: string | URL) => { opened.push(String(url)); return null }
    })
    await page.goto('/')
    const label = page.getByRole('button', { name: 'Demo' })
    const note = page.getByRole('note')
    for (let tap = 0; tap < 3; tap++) {
      await label.tap()
      await page.waitForTimeout(300) // let any emulated mouse events after the tap land
      await expect(note).toBeVisible()
    }

    await page.getByRole('link', { name: 'download the app' }).tap()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened))
      .toEqual(['https://github.com/Bumble-Works/rondel-it/releases/latest'])
    await expect(note).toBeVisible()

    await page.getByRole('heading', { level: 1, name: 'Today' }).tap()
    await expect(note).toBeHidden()
  })
})
