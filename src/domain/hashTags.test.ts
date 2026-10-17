import { findTagByName, hashQueryAt, matchTags, removeHashToken } from './hashTags'
import type { Tag } from './types'

const tags: Tag[] = [
  { id: '1', name: 'family', color: '#000' },
  { id: '2', name: 'Work', color: '#000' },
  { id: '3', name: 'homework', color: '#000' },
]

describe('hash tags', () => {
  it('finds the #word being typed before the caret', () => {
    expect(hashQueryAt('Call mom #fam', 13)).toEqual({ start: 9, query: 'fam' })
    expect(hashQueryAt('#', 1)).toEqual({ start: 0, query: '' })
    expect(hashQueryAt('Call mom #fam ', 14)).toBeNull()
    expect(hashQueryAt('issue#3', 7)).toBeNull()
  })

  it('matches tags ignoring case, prefix matches first', () => {
    expect(matchTags(tags, 'WOR').map((t) => t.name)).toEqual(['Work', 'homework'])
    expect(findTagByName(tags, 'Family')?.id).toBe('1')
    expect(findTagByName(tags, 'familia')).toBeUndefined()
  })

  it('removes the token and tidies spaces', () => {
    expect(removeHashToken('Call mom #fam', 9, 13)).toEqual({ text: 'Call mom', caret: 8 })
    expect(removeHashToken('#work review', 0, 5)).toEqual({ text: 'review', caret: 0 })
    expect(removeHashToken('Call #fam mom', 5, 9)).toEqual({ text: 'Call mom', caret: 5 })
  })
})
