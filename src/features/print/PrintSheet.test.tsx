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
    doingRondelCount: 0,
    startedAt: null,
    bucketListOrigin: false,
    canceledAt: null,
    rondelHistory: [],
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
        title="Monday, October 19"
        showHeadings={false}
        sections={[{ key: '2026-10-19', heading: 'Monday, October 19', tasks: [
          task({ title: 'Ship release', status: 'done' }),
          task({ title: 'Review PR', status: 'doing', flagged: true, tagIds: ['w'], note: 'Ask about tests\nand docs' }),
          task({ title: 'Started, moved on', status: 'doing', carriedToId: 'next' }),
          task({ title: 'Email Sam' }),
        ] }]}
        tagsById={new Map([['w', work]])}
        filterSummary="Tags: #work"
      />,
    )
    const sheet = document.querySelector('.print-sheet')!
    expect(sheet.querySelector('h1')).toHaveTextContent('Monday, October 19')
    expect(sheet).toHaveTextContent('4 tasks · Filtered: Tags: #work')
    expect(sheet).toHaveTextContent('●Ship release — Done')
    expect(sheet).toHaveTextContent('◐⚑ Review PR — Doing')
    expect(sheet).toHaveTextContent('#work')
    expect(sheet.querySelector('.print-note')?.textContent).toBe('Ask about tests\nand docs')
    expect(sheet).toHaveTextContent('Started, moved on — Worked on, carried forward')
    expect(sheet).toHaveTextContent('○Email Sam — To do')
    expect(sheet.querySelector('h2')).toBeNull() // one day: no headings
  })

  it('says so when the (filtered) view is empty', () => {
    render(<PrintSheet title="Monday, October 19" sections={[]} showHeadings={false} tagsById={new Map()} filterSummary={null} />)
    expect(document.querySelector('.print-sheet')).toHaveTextContent('0 tasksNothing to print.')
  })

  it('prints a week as one sheet with a heading per day, in calendar order', () => {
    render(
      <PrintSheet
        title="Week of Oct 19 – Oct 25"
        showHeadings
        sections={[
          { key: '2026-10-19', heading: 'Monday, October 19', tasks: [task({ title: 'Monday thing' })] },
          { key: '2026-10-21', heading: 'Wednesday, October 21', tasks: [task({ title: 'Wednesday thing', status: 'done' })] },
        ]}
        tagsById={new Map()}
        filterSummary={null}
      />,
    )
    const sheet = document.querySelector('.print-sheet')!
    expect(sheet.querySelector('h1')).toHaveTextContent('Week of Oct 19 – Oct 25')
    expect(sheet).toHaveTextContent('2 tasks')
    expect([...sheet.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Monday, October 19', 'Wednesday, October 21'])
  })

  it('keeps the heading when asked, even with one section', () => {
    render(
      <PrintSheet
        title="Week of Oct 19 – Oct 25"
        showHeadings
        sections={[{ key: '2026-10-21', heading: 'Wednesday, October 21', tasks: [task({ title: 'Only one' })] }]}
        tagsById={new Map()}
        filterSummary={null}
      />,
    )
    expect(document.querySelector('.print-sheet h2')).toHaveTextContent('Wednesday, October 21')
  })
})
