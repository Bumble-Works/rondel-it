import { timeTokenAt } from './timeToken'

describe('timeTokenAt', () => {
  it.each(['Call @10:00', 'Call 10:00', '10:00'])('finds a complete time in %s', (text) => {
    expect(timeTokenAt(text, text.length)).toEqual({ start: text.indexOf('10:00') - (text.includes('@') ? 1 : 0), time: '10:00' })
  })
  it('pads single-digit hours and supports the caret in the middle of a title', () => {
    expect(timeTokenAt('Call 9:05 tomorrow', 9)).toEqual({ start: 5, time: '09:05' })
  })
  it.each(['Call @24:00', 'Call 10:60', 'Call 10:0', 'http://site/10:00', 'Call abc10:00', 'Call #10:00'])('keeps %s as text', (text) => {
    expect(timeTokenAt(text, text.length)).toBeNull()
  })
  it('does not suggest part of a word after the caret', () => {
    expect(timeTokenAt('10:00am', 5)).toBeNull()
  })
})
