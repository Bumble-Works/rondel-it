import { expect, test, type Page } from '@playwright/test'

/** The row for a task title within the visible board. */
const row = (page: Page, title: string) => page.locator('.task-row', { hasText: title })

async function addTask(page: Page, title: string) {
  const input = page.getByPlaceholder('Add a task')
  await input.fill(title)
  await input.press('Enter')
  await expect(row(page, title)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
})

test('adds a task, starts it, flags it, finishes it, and keeps it after reload', async ({ page }) => {
  await addTask(page, 'Write the report')
  const task = row(page, 'Write the report')

  await task.getByRole('button', { name: 'Mark as doing' }).click()
  await expect(task.getByRole('button', { name: 'Mark as done' })).toBeVisible()

  await task.getByRole('button', { name: 'Flag as important' }).click()
  await expect(task).toHaveClass(/is-flagged/)

  await task.getByRole('button', { name: 'Mark as done' }).click()
  await expect(task).toHaveClass(/is-done/)

  await page.reload()
  await expect(row(page, 'Write the report')).toHaveClass(/is-done/)
  await expect(row(page, 'Write the report')).toHaveClass(/is-flagged/)
})

test('#tag while typing creates and attaches a tag, stripped from the title', async ({ page }) => {
  const input = page.getByPlaceholder('Add a task')
  await input.fill('Buy milk #errands')
  await page.getByRole('option', { name: 'Create #errands' }).click()
  await expect(input).toHaveValue('Buy milk')
  await input.press('Enter')

  const task = row(page, 'Buy milk')
  await expect(task).toBeVisible()
  await expect(task.locator('.chip', { hasText: 'errands' })).toBeVisible()
  await expect(task.locator('.task-title')).toHaveText('Buy milk')
})

test('rondeling a doing task to tomorrow keeps today’s history and carries a doing copy', async ({ page }) => {
  await addTask(page, 'Big refactor')
  const today = row(page, 'Big refactor')
  await today.getByRole('button', { name: 'Mark as doing' }).click()

  await today.getByRole('button', { name: 'Rondel this task' }).click()
  await page.getByRole('menuitem', { name: 'Tomorrow' }).click()

  // Today keeps a greyed-out history copy that can't be rondeled again.
  await expect(today).toHaveClass(/is-carried/)
  await expect(today.getByRole('button', { name: 'Rondel this task' })).toBeDisabled()

  // Tomorrow has the live copy, still in progress.
  await page.getByRole('button', { name: 'Next day' }).click()
  const tomorrow = row(page, 'Big refactor')
  await expect(tomorrow).not.toHaveClass(/is-carried/)
  await expect(tomorrow.getByRole('button', { name: 'Mark as done' })).toBeVisible()
})

test('prints one day as a clean sheet', async ({ page }) => {
  await addTask(page, 'Prep slides')
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', 'yes')
  })
  await page.locator('.board-section', { hasText: 'Prep slides' }).getByRole('button', { name: /^Print / }).click()

  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-sheet')).toBeVisible()
  await expect(page.locator('.print-sheet')).toContainText('Prep slides — To do')
  await expect(page.locator('.app')).toBeHidden()
})

test('a task left undone on a past day nags, and Done marks it done on that day', async ({ page }) => {
  await page.getByRole('button', { name: 'Previous day' }).click()
  await addTask(page, 'Forgot to check off')
  await page.reload()

  const nag = page.getByRole('dialog')
  const section = nag.getByRole('region', { name: 'Left undone on past days' })
  await expect(section).toContainText('Forgot to check off')
  await section.getByRole('button', { name: 'Mark done' }).click()
  await expect(nag).toBeHidden()

  await page.getByRole('button', { name: 'Previous day' }).click()
  await expect(row(page, 'Forgot to check off')).toHaveClass(/is-done/)
})


test('#tag in the side panel title shows its suggestions on top and attaches the tag', async ({ page }) => {
  await addTask(page, 'Plan offsite')
  await page.getByRole('button', { name: /^Open Plan offsite/ }).click()
  const title = page.getByLabel('Title')
  await title.click()
  await title.press('End')
  await title.pressSequentially(' #team')
  const create = page.getByRole('option', { name: 'Create #team' })
  await expect(create).toBeVisible()
  await create.click()
  await expect(title).toHaveValue('Plan offsite')
  await expect(page.locator('.detail-panel .chip', { hasText: 'team' })).toBeVisible()
})

test('#tag suggestions in "Add a task" are not cut off by the day section', async ({ page }) => {
  const input = page.getByPlaceholder('Add a task')
  await input.pressSequentially('Buy milk #err')
  const option = page.getByRole('option', { name: 'Create #err' })
  const box = (await option.boundingBox())!
  const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.textContent?.trim(), [box.x + box.width / 2, box.y + box.height / 2])
  expect(onTop).toBe('Create #err')
})

test('#tag suggestions in the side panel title close when you click away', async ({ page }) => {
  await addTask(page, 'Plan offsite')
  await page.getByRole('button', { name: /^Open Plan offsite/ }).click()
  const title = page.getByLabel('Title')
  await title.click()
  await title.press('End')
  await title.pressSequentially(' #team')
  await expect(page.getByRole('listbox', { name: 'Tag suggestions' })).toBeVisible()
  await page.locator('#detail-note').click()
  await expect(page.getByRole('listbox', { name: 'Tag suggestions' })).toBeHidden()
})

test('sets a reminder on a task; the row shows it and it survives a reload', async ({ page }) => {
  await addTask(page, 'Call the bank')
  await row(page, 'Call the bank').locator('.task-title').click({ force: true })
  const reminder = page.getByLabel('Reminder')
  await reminder.fill('09:30')
  await reminder.blur()
  await expect(row(page, 'Call the bank').locator('.task-reminder')).toBeVisible()

  await page.reload()
  await expect(row(page, 'Call the bank').locator('.task-reminder')).toContainText('9:30')
})

test('filters by a tag even when it is the only tag', async ({ page }) => {
  const input = page.getByPlaceholder('Add a task')
  await input.fill('Pay bills #home')
  await page.getByRole('option', { name: 'Create #home' }).click()
  await input.press('Enter')
  await addTask(page, 'Untagged thing')

  await page.locator('.sidebar-pill', { hasText: 'home' }).click()
  await expect(page.locator('.sidebar-pill', { hasText: 'home' })).toHaveClass(/is-active/)
  await expect(row(page, 'Pay bills')).toBeVisible()
  await expect(row(page, 'Untagged thing')).toBeHidden()
})
