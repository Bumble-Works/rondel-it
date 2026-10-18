import type { Task } from '../../domain/types'
import type { BoardGroup } from '../board/WeekBoard'
import { printView } from './printView'

const t = (title: string) => ({ id: title, title }) as Task
const day = (key: string, tasks: Task[]): BoardGroup => ({ key, kind: 'day', title: key, tasks })

describe('printView', () => {
  it('prints a week in calendar order, skipping empty days, with day headings', () => {
    const view = printView([day('2026-10-21', [t('Wed')]), day('2026-10-20', []), day('2026-10-19', [t('Mon')])], true)
    expect(view.sections.map((s) => s.heading)).toEqual(['Monday, October 19', 'Wednesday, October 21'])
    expect(view.showHeadings).toBe(true)
  })

  it('prints a lone day or the Bucket List without headings', () => {
    expect(printView([day('2026-10-19', [t('Mon')])], false).showHeadings).toBe(false)
    const bucket: BoardGroup = { key: 'bucket-list', kind: 'bucket', title: 'Bucket List', tasks: [t('Learn piano')] }
    expect(printView([bucket], false)).toMatchObject({ showHeadings: false, sections: [{ heading: 'Bucket List' }] })
  })
})
