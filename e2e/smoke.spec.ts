import { expect, test, type Locator, type Page } from '@playwright/test'

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

  await task.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Flag as important' }).click()
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
  // The morning review is a once-a-day catch-up, keyed in rondel.schedule.fired.
  // Reloading is a second open of the same day, so make it behave like the first
  // open: widen the review window (so "now" is inside the day) and clear the
  // fired-set before the app boots. addInitScript runs before app JS on reload,
  // so the first load's saved keys can't leak in and suppress the nag.
  await page.addInitScript(() => {
    const s = JSON.parse(localStorage.getItem('rondel.v6.settings') ?? '{}') as Record<string, unknown>
    localStorage.setItem(
      'rondel.v6.settings',
      JSON.stringify({ ...s, dayStartTime: '00:00', endOfDayTime: '23:59' }),
    )
    localStorage.setItem('rondel.schedule.fired', '[]')
  })
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
  // The nag may or may not be open here, depending on review timing.
  const later = page.getByRole('dialog').getByRole('button', { name: 'Later' })
  if (await later.count()) await later.click()
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
  await expect(row(page, 'Call the bank').getByRole('button', { name: /Change time:.*9:30/ })).toBeVisible()

  await page.reload()
  await expect(row(page, 'Call the bank').getByRole('button', { name: /Change time:.*9:30/ })).toBeVisible()
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

test('copies a task to tomorrow as a fresh to-do, keeping the original', async ({ page }) => {
  await addTask(page, 'Water plants')
  const original = row(page, 'Water plants')
  await original.getByRole('button', { name: 'Mark as doing' }).click()
  await original.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Copy to tomorrow' }).click()

  // Today's stays as it was.
  await expect(original.getByRole('button', { name: 'Mark as done' })).toBeVisible()
  await page.getByRole('button', { name: 'Next day' }).click()
  const copy = row(page, 'Water plants')
  await expect(copy.getByRole('button', { name: 'Mark as doing' })).toBeVisible()
})

test('copies a task to a picked date', async ({ page }) => {
  await addTask(page, 'Renew passport')
  await row(page, 'Renew passport').getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Copy to a date…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Copy to a date' })
  // It starts at tomorrow; pick the day after.
  const input = dialog.getByLabel('Add a new to-do copy on')
  const tomorrow = new Date(await input.inputValue() + 'T12:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  await input.fill(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`)
  await dialog.getByRole('button', { name: 'Copy it' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Next day' }).click()
  await expect(row(page, 'Renew passport')).toBeHidden()
  await page.getByRole('button', { name: 'Next day' }).click()
  await expect(row(page, 'Renew passport')).toBeVisible()
})

test('Add reminder in the ⋯ menu opens the task with its reminder ready', async ({ page }) => {
  await addTask(page, 'Call mom')
  await row(page, 'Call mom').getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Add reminder' }).click()
  await expect(page.getByRole('complementary', { name: 'Task details' })).toBeVisible()
  await expect(page.getByLabel('Reminder')).toBeFocused()
})

test('a copy of a recurring task starts new: not recurring, never rondeled', async ({ page }) => {
  await page.getByRole('button', { name: 'Recurring' }).click()
  // Daily (the default): today's task is created right away.
  await page.getByLabel('Title', { exact: true }).fill('Stretch')
  await page.getByRole('button', { name: 'Add recurring task' }).click()
  await page.getByRole('button', { name: 'Back to tasks' }).click()

  await expect(row(page, 'Stretch').getByRole('img', { name: 'Recurring task' })).toBeVisible()
  await row(page, 'Stretch').getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Copy to tomorrow' }).click()

  // Tomorrow has only the copy (the rule's next one waits for today's to be done).
  await page.getByRole('button', { name: 'Next day' }).click()
  const copy = row(page, 'Stretch')
  await expect(copy).toHaveCount(1)
  await expect(copy.getByRole('img', { name: 'Recurring task' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Stretch' }).click()
  const panel = page.getByRole('complementary', { name: 'Task details' })
  await expect(panel.locator('dl div', { hasText: 'Rondeled' }).locator('dd')).toHaveText('Never')
  await expect(panel.locator('dl div', { hasText: 'Repeats' })).toHaveCount(0)
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

test('tag filter: "Any selected" shows either tag, "All selected" only both', async ({ page }) => {
  const input = page.getByPlaceholder('Add a task')
  const add = async (title: string, tag?: string) => {
    await input.fill(tag ? `${title} #${tag}` : title)
    if (tag) {
      const existing = page.getByRole('option', { name: new RegExp(`^#${tag}`) })
      await ((await existing.count()) ? existing : page.getByRole('option', { name: `Create #${tag}` })).click()
    }
    await input.press('Enter')
    await expect(row(page, title)).toBeVisible()
  }
  await add('Fix sink', 'home')
  await add('Ship report', 'work')
  await add('Plan offsite', 'work')
  await add('Untagged')
  // Both tags on one task.
  await page.getByRole('button', { name: 'Open Plan offsite' }).click()
  const panel = page.getByRole('complementary', { name: 'Task details' })
  await panel.getByRole('button', { name: 'Tags', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'home', exact: true }).click()
  await panel.getByRole('button', { name: 'Close' }).click()

  await page.locator('.sidebar-pill', { hasText: 'home' }).click()
  await page.locator('.sidebar-pill', { hasText: 'work' }).click()
  for (const title of ['Fix sink', 'Ship report', 'Plan offsite']) await expect(row(page, title)).toBeVisible()
  await expect(row(page, 'Untagged')).toBeHidden()

  await page.getByRole('button', { name: 'Any selected' }).click()
  await page.getByRole('menuitem', { name: 'All selected' }).click()
  await expect(row(page, 'Plan offsite')).toBeVisible()
  await expect(row(page, 'Fix sink')).toBeHidden()
  await expect(row(page, 'Ship report')).toBeHidden()
})

test('two quick #tag picks in the side panel title both stick', async ({ page }) => {
  await addTask(page, 'Plan trip')
  await page.getByRole('button', { name: 'Open Plan trip' }).click()
  const panel = page.getByRole('complementary', { name: 'Task details' })
  const title = panel.getByLabel('Title')
  await title.click()
  await title.press('End')
  // The second pick doesn't wait for the first tag to be saved.
  await title.pressSequentially(' #travel')
  await page.getByRole('option', { name: 'Create #travel' }).click()
  await expect(title).toHaveValue('Plan trip')
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
  await expect(page.locator('.recurring-item-title')).toHaveText('Stretch')
  await page.getByRole('button', { name: 'Edit Stretch' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Morning stretch')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('button', { name: 'Back to tasks' }).click()

  await expect(row(page, 'Morning stretch')).toBeVisible()
  await expect(page.locator('.task-row', { hasText: /^Stretch$/ })).toHaveCount(0)
})

test('quick add works from Settings and Recurring, then returns to the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByRole('button', { name: 'Add a task' }).click()
  const fromSettings = page.getByRole('dialog', { name: 'Add a task' })
  await expect(fromSettings).toBeVisible()
  await fromSettings.getByPlaceholder('What needs doing?').fill('Quick from settings')
  await fromSettings.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  await expect(row(page, 'Quick from settings')).toBeVisible()

  await page.getByRole('button', { name: 'Recurring' }).click()
  await expect(page.getByText('Your recurring tasks')).toBeVisible()
  await page.locator('.recurring-title').click()
  await page.keyboard.press('n')

  const fromRecurring = page.getByRole('dialog', { name: 'Add a task' })
  await expect(fromRecurring).toBeVisible()
  await fromRecurring.getByPlaceholder('What needs doing?').fill('Quick from recurring')
  await fromRecurring.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  await expect(row(page, 'Quick from recurring')).toBeVisible()
})

test('Escape closes quick-add tag suggestions without closing the composer', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a task' }).click()
  const modal = page.getByRole('dialog', { name: 'Add a task' })
  const input = modal.getByPlaceholder('What needs doing?')
  await input.fill('Buy milk #err')

  await expect(page.getByRole('listbox', { name: 'Tag suggestions' })).toBeVisible()
  await input.press('Escape')
  await expect(page.getByRole('listbox', { name: 'Tag suggestions' })).toHaveCount(0)
  await expect(modal).toBeVisible()
})

/**
 * Drags a task by its grip onto `target`, moving in steps like a person would,
 * and lets go once `ready` shows the drop has registered.
 */
async function dragTask(page: Page, title: string, target: Locator, ready: Locator, at: 'bottom' | 'center' = 'center') {
  // Hovering waits for the grip to stop moving (the list may still be settling).
  await row(page, title).locator('.task-grip').hover()
  await page.mouse.down()
  const box = await target.boundingBox()
  if (!box) throw new Error(`Can't drag ${title}: the target isn't on screen`)
  const y = at === 'bottom' ? box.y + box.height - 4 : box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y, { steps: 12 })
  await expect(ready).toBeVisible()
  await page.mouse.up()
}

test('drags a task into another section, and reorders within a day', async ({ page }) => {
  await addTask(page, 'First')
  await addTask(page, 'Second')

  await dragTask(page, 'First', row(page, 'Second'), page.locator('.task-row.is-drop-after'), 'bottom')
  await expect(page.locator('.task-row .task-title')).toHaveText(['Second', 'First'])

  // Into another section: the same drop path as another day.
  const unassigned = page.locator('.board-section', { hasText: 'Unassigned' })
  const unassignedBody = unassigned.locator('.board-section-body')
  await dragTask(page, 'First', unassignedBody, unassigned.locator('.board-section-body.is-drop-target'))
  await expect(unassigned.locator('.task-row', { hasText: 'First' })).toBeVisible()

  await page.reload()
  await expect(page.locator('.board-section', { hasText: 'Unassigned' }).locator('.task-row', { hasText: 'First' })).toBeVisible()
})
