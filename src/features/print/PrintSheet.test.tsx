import { render } from '@testing-library/react'
import type { Tag, Task } from '../../domain/types'
import { PrintSheet } from './PrintSheet'

function task(fields: Partial<Task>): Task {
  return {
    id: fields.title ?? 't',
    title: 't',
    status: 'todo',
    dayDate: '2026-10-19',
    rondeled: false,
    bucket: null,
    position: 0,
    rondelCount: 0,
    flagged: false,
    reminderTime: null,
    tagIds: [],
    note: '',
    createdAt: '',
    completedAt: null,
    recurringRuleId: null,
    originDate: '2026-10-19',
    originTaskId: null,
    previousTaskId: null,
    carriedToId: null,
    ...fields,
  }
}

const work: Tag = { id: 'w', name: 'work', color: '#000' }

describe('PrintSheet', () => {
  it('prints the day with each task’s status, flag, tags and full note', () => {
    render(
      <PrintSheet
        dayIso="2026-10-19"
        tasks={[
          task({ title: 'Ship release', status: 'done' }),
          task({ title: 'Review PR', status: 'doing', flagged: true, tagIds: ['w'], note: 'Ask about tests\nand docs' }),
          task({ title: 'Started, moved on', status: 'doing', carriedToId: 'next' }),
          task({ title: 'Email Sam' }),
        ]}
        tagsById={new Map([['w', work]])}
        filterSummary="Tags: #work"
      />,
    )
    const sheet = document.querySelector('.print-sheet')!
    expect(sheet.querySelector('h1')).toHaveTextContent('Monday, October 19')
    expect(sheet).toHaveTextContent('4 tasks · Filtered: Tags: #work')
    expect(sheet).toHaveTextContent('☑Ship release — Done')
    expect(sheet).toHaveTextContent('◐⚑ Review PR — Doing')
    expect(sheet).toHaveTextContent('#work')
    expect(sheet.querySelector('.print-note')?.textContent).toBe('Ask about tests\nand docs')
    expect(sheet).toHaveTextContent('Started, moved on — Worked on, carried forward')
    expect(sheet).toHaveTextContent('☐Email Sam — To do')
  })

  it('says so when the (filtered) day is empty', () => {
    render(<PrintSheet dayIso="2026-10-19" tasks={[]} tagsById={new Map()} filterSummary={null} />)
    expect(document.querySelector('.print-sheet')).toHaveTextContent('0 tasksNothing on this day.')
  })
})
