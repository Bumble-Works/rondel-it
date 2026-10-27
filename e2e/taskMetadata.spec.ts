import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'en-US', timezoneId: 'UTC' })

const row = (page: Page, title: string) => page.locator('.task-row', { has: page.getByRole('button', { name: `Open ${title}`, exact: true }) })

async function addTask(page: Page, title: string) {
  const input = page.getByPlaceholder('Add a task', { exact: true })
  await input.fill(title)
  await input.press('Enter')
  await expect(row(page, title)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-28T08:00:00Z'))
  await page.addInitScript(() => {
    if (localStorage.getItem('rondel.v6.tags')) return
    localStorage.setItem('rondel.v6.tags', JSON.stringify([
      { id: 'work', name: 'work', color: '#3b82f6' },
      { id: 'home', name: 'home', color: '#16b98a' },
    ]))
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
})

for (const width of [1280, 360]) {
  test(`edits row tags and time with notes on a separate line at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await addTask(page, 'Plan next week')
    const task = row(page, 'Plan next week')
    await task.getByRole('button', { name: 'Tags', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Find or create a tag' })).toBeFocused()
    await page.getByRole('menuitemcheckbox', { name: 'work', exact: true }).click()
    await page.getByRole('menuitemcheckbox', { name: 'home', exact: true }).click()
    await expect(page.getByRole('menuitemcheckbox', { name: 'work', exact: true })).toBeChecked()
    await expect(page.getByRole('menuitemcheckbox', { name: 'home', exact: true })).toBeChecked()
    await page.keyboard.press('Escape')
    await task.getByRole('button', { name: 'Remove home' }).click()
    await task.getByRole('button', { name: 'Add time', exact: true }).click()
    await page.getByLabel('Reminder time', { exact: true }).fill('10:00')
    await page.getByRole('button', { name: 'Set time', exact: true }).click()
    await task.getByRole('button', { name: 'Add note', exact: true }).click()
    const note = page.getByRole('dialog', { name: 'Note', exact: true })
    await note.getByRole('textbox').fill('Bring the draft agenda')
    await note.getByRole('button', { name: 'Save note' }).click()
    await expect(task.locator('.task-note-preview')).toHaveText('Bring the draft agenda')
    await expect(page.getByRole('complementary', { name: 'Task details' })).toHaveCount(0)

    const titleBox = (await task.locator('.task-title').boundingBox())!
    const noteBox = (await task.locator('.task-note-preview').boundingBox())!
    const controlsBox = (await task.locator('.task-row-controls').boundingBox())!
    expect(noteBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height)
    expect(controlsBox.y).toBeGreaterThanOrEqual(noteBox.y + noteBox.height)
    expect(Math.abs(noteBox.x - titleBox.x)).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.reload()
    await expect(task.getByRole('button', { name: 'Remove work' })).toBeVisible()
    await expect(task.getByRole('button', { name: 'Remove home' })).toHaveCount(0)
    await expect(task.getByRole('button', { name: 'Change time: 10:00 AM' })).toBeVisible()
    await expect(task.locator('.task-note-preview')).toHaveText('Bring the draft agenda')
    await task.getByRole('button', { name: 'Change time: 10:00 AM' }).click()
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(task.getByRole('button', { name: 'Add time', exact: true })).toBeVisible()
    await task.getByRole('button', { name: 'Open Plan next week', exact: true }).click()
    await expect(task.getByRole('button', { name: 'Tags', exact: true })).toBeDisabled()
    await expect(task.getByRole('button', { name: 'Add time', exact: true })).toBeDisabled()
  })
}

for (const token of ['@10:00', '10:00']) {
  test(`inline add picks ${token} without prematurely adding the task`, async ({ page }) => {
    const input = page.getByPlaceholder('Add a task', { exact: true })
    await input.fill(`Call mom ${token}`)
    await expect(page.getByRole('button', { name: 'Set reminder for 10:00 AM', exact: true })).toBeVisible()
    await input.press('Enter')
    await expect(input).toHaveValue('Call mom')
    await expect(row(page, 'Call mom')).toHaveCount(0)
    await input.press('Enter')
    await expect(row(page, 'Call mom').getByRole('button', { name: 'Change time: 10:00 AM' })).toBeVisible()
    await page.reload()
    await expect(row(page, 'Call mom').getByRole('button', { name: 'Change time: 10:00 AM' })).toBeVisible()
  })
}

test('composer picks tags and time without submitting or closing on Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a task', exact: true }).click()
  const composer = page.getByRole('dialog', { name: 'Add a task', exact: true })
  await composer.getByPlaceholder('What needs doing?').fill('Call the bank')
  await composer.getByRole('button', { name: 'Tags', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'work', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(composer).toBeVisible()
  await composer.getByRole('button', { name: 'Add time', exact: true }).click()
  await page.getByLabel('Reminder time', { exact: true }).fill('11:30')
  await page.getByRole('button', { name: 'Set time', exact: true }).click()
  await expect(composer).toBeVisible()
  await expect(row(page, 'Call the bank')).toHaveCount(0)
  await composer.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('complementary', { name: 'Task details' }).getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await expect(row(page, 'Call the bank').getByRole('button', { name: 'Remove work' })).toBeVisible()
  await expect(row(page, 'Call the bank').getByRole('button', { name: 'Change time: 11:30 AM' })).toBeVisible()
})

test('recurring tag hint appears once and occurrence tags do not change future tasks', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Stretch')
  await page.getByRole('button', { name: 'Tags', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'work', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Add recurring task', exact: true }).click()
  await expect(page.locator('.recurring-item-title')).toHaveText('Stretch')
  await page.getByRole('button', { name: '← Back to tasks', exact: true }).click()
  const task = row(page, 'Stretch')
  await task.getByRole('button', { name: 'Tags', exact: true }).click()
  await expect(page.getByRole('note')).toHaveText('Tags apply to this task only. Edit the series in recurring.')
  await page.getByRole('menuitemcheckbox', { name: 'home', exact: true }).click()
  await expect(task.getByRole('button', { name: 'Remove home' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await task.getByRole('button', { name: 'Tags', exact: true }).click()
  await expect(page.getByRole('note')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await task.getByRole('button', { name: 'Mark as doing', exact: true }).click()
  await task.getByRole('button', { name: 'Mark as done', exact: true }).click()
  await expect(task).toHaveClass(/is-done/)
  await page.clock.setFixedTime(new Date('2026-10-29T08:00:00Z'))
  await page.reload()
  await expect(task.getByRole('button', { name: 'Remove work' })).toBeVisible()
  await expect(task.getByRole('button', { name: 'Remove home' })).toHaveCount(0)
  await expect(task).not.toHaveClass(/is-done/)
})
