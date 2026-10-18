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
  await page.getByRole('button', { name: 'Print this day' }).click()

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

test('prints only what the filter shows, and says which filter is on', async ({ page }) => {
  const input = page.getByPlaceholder('Add a task')
  await input.fill('Pay bills #home')
  await page.getByRole('option', { name: 'Create #home' }).click()
  await input.press('Enter')
  await expect(row(page, 'Pay bills')).toBeVisible()
  await input.fill('Team sync #work')
  await page.getByRole('option', { name: 'Create #work' }).click()
  await input.press('Enter')
  await expect(row(page, 'Team sync')).toBeVisible()

  await page.locator('.sidebar-pill', { hasText: 'home' }).click()
  await expect(row(page, 'Team sync')).toBeHidden()
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', 'yes')
  })
  await page.getByRole('button', { name: 'Print this day' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet.locator('.print-head p')).toHaveText('1 task · Filtered: Tags: #home')
  await expect(sheet).toContainText('Pay bills')
  await expect(sheet).not.toContainText('Team sync')
})

test('prints a single day from its header in Week view', async ({ page }) => {
  await addTask(page, 'Prep for tomorrow')
  await page.locator('.sidebar-link', { hasText: 'Week' }).click()
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', 'yes')
  })
  const top = page.getByRole('button', { name: 'Print this week' })
  await expect(top).toHaveAttribute('title', /^Print Week of .+, every day with tasks$/)

  const daySection = page.locator('.board-section', { hasText: 'Prep for tomorrow' })
  const dayPrint = daySection.locator('.board-section-print')
  await expect(dayPrint).toHaveAttribute('title', /^Print \w+day, \w+ \d+$/)
  const dayLabel = (await dayPrint.getAttribute('title'))!.replace('Print ', '')
  await daySection.hover()
  await dayPrint.click()

  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet.locator('h1')).toHaveText(dayLabel)
  await expect(sheet.locator('h2')).toHaveCount(0)
  await expect(sheet).toContainText('Prep for tomorrow — To do')
})

test('prints the Bucket List from the top bar', async ({ page }) => {
  await page.locator('.sidebar-link', { hasText: 'Bucket List' }).click()
  const add = page.getByPlaceholder('Add to this bucket')
  await add.fill('Learn piano')
  await add.press('Enter')
  await expect(row(page, 'Learn piano')).toBeVisible()
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', 'yes')
  })
  await page.getByRole('button', { name: 'Print the Bucket List' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet.locator('h1')).toHaveText('Bucket List')
  await expect(sheet.locator('h2')).toHaveCount(0)
  await expect(sheet).toContainText('Learn piano — To do')
})

test('prints the whole week from the top bar, skipping empty days and rondeled items', async ({ page }) => {
  await addTask(page, 'This week thing')
  await page.locator('.sidebar-link', { hasText: 'Week' }).click()
  const container = page.locator('.board-section', { hasText: 'Unassigned' }).getByPlaceholder('Add to this bucket')
  await container.fill('Rondeled for later')
  await container.press('Enter')
  await expect(row(page, 'Rondeled for later')).toBeVisible()
  // It's in the current week, so the "Don't lose these" nag opens over the
  // page. Close it to reach the Print button (the nag itself never prints).
  await page.getByRole('dialog').getByRole('button', { name: 'Later' }).click()
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', 'yes')
  })
  await page.getByRole('button', { name: 'Print this week' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet.locator('h1')).toContainText('Week of')
  await expect(sheet.locator('h2')).toHaveCount(1)
  await expect(sheet).toContainText('○This week thing — To do')
  await expect(sheet).not.toContainText('Rondeled for later')
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

test('creates a custom repeat rule; the list describes it, the form resets, and it survives a reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Water the plants')
  await page.getByLabel('Repeats').selectOption('custom')
  await page.getByLabel('Every', { exact: true }).fill('3')
  await page.getByLabel('Unit').selectOption('day')
  await page.getByRole('button', { name: 'Add recurring task' }).click()

  await expect(page.locator('.recurring-item-title')).toHaveText('Water the plants')
  await expect(page.locator('.recurring-item-desc')).toHaveText('Every 3 days')
  // The form starts over for the next rule.
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Repeats')).toHaveValue('daily')
  await expect(page.getByLabel('Unit')).toBeHidden()

  await page.reload()
  await page.getByRole('button', { name: 'Recurring' }).click()
  await expect(page.locator('.recurring-item-desc')).toHaveText('Every 3 days')
})

test('edits a recurring rule: the form fills in, and saving updates the list', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Standup')
  await page.getByRole('button', { name: 'Add recurring task' }).click()
  await expect(page.locator('.recurring-item-desc')).toHaveText('Every day')

  await page.getByRole('button', { name: 'Edit Standup' }).click()
  await expect(page.getByRole('heading', { name: 'Edit recurring task' })).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Standup')
  await page.getByLabel('Title', { exact: true }).fill('Team standup')
  await page.getByLabel('Repeats').selectOption('yearly')
  await page.getByRole('button', { name: 'Flag as important' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByRole('heading', { name: 'New recurring task' })).toBeVisible()
  await expect(page.locator('.recurring-item-title')).toHaveText('Team standup')
  await expect(page.locator('.recurring-item-desc')).toHaveText(/^Every year on /)
  await expect(page.locator('.recurring-item-title svg')).toBeVisible()
})

test('a task from a recurring rule shows the repeat icon, and the side panel says how it repeats', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Stretch')
  await page.getByRole('button', { name: 'Add recurring task' }).click()
  await page.getByRole('button', { name: 'Back to tasks' }).click()

  const task = row(page, 'Stretch')
  await expect(task.getByRole('img', { name: 'Recurring task' })).toHaveAttribute('title', 'Recurring: Every day')
  await task.locator('.task-title').click({ force: true })
  const panel = page.getByRole('complementary', { name: 'Task details' })
  await expect(panel.locator('dl div', { hasText: 'Repeats' }).locator('dd')).toHaveText('Every day')
})


test('#tags in the recurring form work like the task title: pick, strip, attach', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring' }).click()
  const title = page.getByLabel('Title', { exact: true })
  await title.fill('Gym #health')
  await page.getByRole('option', { name: 'Create #health' }).click()
  await expect(title).toHaveValue('Gym')
  await title.press('Enter')

  await expect(page.locator('.recurring-item-title')).toHaveText('Gym')
  await expect(page.locator('.recurring-item .chip', { hasText: 'health' })).toBeVisible()
})

test('two quick #tag picks in the side panel title both stick', async ({ page }) => {
  await addTask(page, 'Plan trip')
  await row(page, 'Plan trip').locator('.task-title').click({ force: true })
  const panel = page.getByRole('complementary', { name: 'Task details' })
  const title = panel.getByLabel('Title')
  await title.click()
  await title.press('End')
  // No waiting between the two picks.
  await title.pressSequentially(' #travel')
  await page.getByRole('option', { name: 'Create #travel' }).click()
  await title.pressSequentially(' #family')
  await page.getByRole('option', { name: 'Create #family' }).click()

  await expect(panel.locator('.tag-picker .chip', { hasText: 'travel' })).toBeVisible()
  await expect(panel.locator('.tag-picker .chip', { hasText: 'family' })).toBeVisible()
  await page.reload()
  const saved = row(page, 'Plan trip')
  await expect(saved.locator('.chip', { hasText: 'travel' })).toBeVisible()
  await expect(saved.locator('.chip', { hasText: 'family' })).toBeVisible()
})

test('editing a recurring rule updates the task already on the list', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Stretch')
  await page.getByRole('button', { name: 'Add recurring task' }).click()
  await page.getByRole('button', { name: 'Edit Stretch' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Morning stretch')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('button', { name: 'Back to tasks' }).click()

  await expect(row(page, 'Morning stretch')).toBeVisible()
  await expect(page.locator('.task-row', { hasText: /^Stretch$/ })).toHaveCount(0)
})

