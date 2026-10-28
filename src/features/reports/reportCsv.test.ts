import { reportFixture, reportFixtureTask as task, reportFixtureTags as tags } from '../../test/reportFixtures'
import { reportCsv } from './reportCsv'

// Parse records with embedded commas, quotes and newlines just as a CSV reader does.
function records(csv: string): string[][] {
  const result: string[][] = [[]]
  let cell = '', quoted = false
  const text = csv.replace(/^\uFEFF/, '')
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index++ }
      else quoted = !quoted
    } else if (!quoted && (char === ',' || char === '\r')) {
      result.at(-1)!.push(cell)
      cell = ''
      if (char === '\r') { result.push([]); index++ }
    } else cell += char
  }
  result.at(-1)!.push(cell)
  return result
}

function exportRecords(tasks: Parameters<typeof reportFixture>[0]) {
  const dashboard = reportFixture(tasks)
  const csv = reportCsv(dashboard.rows, tags)
  const [headings, ...body] = records(csv)
  expect(headings).toEqual(['Task', 'Status', 'Tags', 'First seen', 'Scheduled date', 'Completed date',
    'Canceled date', 'Days in progress', 'Rondels', 'Note'])
  expect(body.every((row) => row.length === headings.length)).toBe(true)
  return { csv, body: body.map((values) => Object.fromEntries(headings.map((heading, index) => [heading, values[index]]))) }
}

it('exports ten useful columns once per chain, preserving same-titled tasks and completed progress days', () => {
  const tasks = [
    task({ id: 'source', title: 'Earlier title', createdAt: '2026-10-10T08:00:00Z', status: 'doing', carriedToId: 'live',
      startedAt: '2026-10-11T09:00:00Z', dayDate: '2026-10-11', originDate: '2026-10-10' }),
    task({ id: 'live', title: 'Current title', originTaskId: 'source', previousTaskId: 'source', status: 'done',
      createdAt: '2026-10-12T08:00:00Z', startedAt: '2026-10-11T09:00:00Z', completedAt: '2026-10-13T12:00:00Z',
      originDate: '2026-10-10', flagged: true, reminderTime: '10:30', recurringRuleId: 'rule', tagIds: ['work'],
      rondelCount: 1, doingRondelCount: 1, note: 'All the context' }),
    task({ id: 'independent', title: 'Current title' }),
  ]
  const { csv, body } = exportRecords(tasks)
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(body).toHaveLength(2)
  expect(body.find((row) => row.Tags === 'Work')).toEqual({
    Task: 'Current title', Status: 'Completed', Tags: 'Work', 'First seen': '2026-10-10',
    'Scheduled date': '2026-10-27', 'Completed date': '2026-10-13', 'Canceled date': '',
    'Days in progress': '2', Rondels: '1', Note: 'All the context',
  })
  expect(csv).not.toContain('source')
  expect(csv).not.toContain('live')
  expect(csv).not.toContain('independent')
})

it('preserves unknown evidence, zero counts and every row beyond the table page size', () => {
  const tasks = Array.from({ length: 55 }, (_, index) => task({ id: `task-${index}` }))
  tasks[0] = task({ id: 'legacy', title: 'Legacy task', bucketListOrigin: null, doingRondelCount: null, startedAt: null })
  const { body } = exportRecords(tasks)
  expect(body).toHaveLength(55)
  expect(body.find((row) => row.Task === 'Legacy task')).toMatchObject({
    Rondels: '0', 'Days in progress': '', 'Completed date': '', 'Canceled date': '',
  })
})

it('round-trips Unicode, commas, quotes and full multiline notes while neutralizing formulas', () => {
  const note = 'Full note, with "quotes"\nשלום 🎉\r\nSecond paragraph'
  const { body } = exportRecords([task({ title: 'Review, "release" 🎉', note })])
  expect(body[0].Task).toBe('Review, "release" 🎉')
  expect(body[0].Note).toBe(note)
  for (const value of ['=HYPERLINK("https://example.com")', '+2', '-2', '@SUM(A1)', '  =SUM(A1)', '\tvalue', '\nvalue']) {
    const { body: safe } = exportRecords([task({ title: value, note: value })])
    expect(safe[0].Task).toBe(`'${value}`)
    expect(safe[0].Note).toBe(`'${value}`)
  }
})

it('keeps cancellation dates and leaves an unscheduled date blank', () => {
  const { body } = exportRecords([
    task({ title: 'Canceled work', status: 'canceled', canceledAt: '2026-10-22T12:00:00Z' }),
    task({ id: 'parked', title: 'Parked work', bucket: 'bucket-list', dayDate: null, rondelCount: 1 }),
  ])
  expect(body.find((row) => row.Task === 'Canceled work')).toMatchObject({
    Status: 'Canceled', 'Canceled date': '2026-10-22', 'Completed date': '', 'Days in progress': '',
  })
  expect(body.find((row) => row.Task === 'Parked work')).toMatchObject({ 'Scheduled date': '', Rondels: '1' })
})
