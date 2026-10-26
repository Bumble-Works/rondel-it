import { toQuickAddCreateTaskInput } from './quickAddInput'

describe('toQuickAddCreateTaskInput', () => {
  it('maps defaults and de-duplicates merged tag ids', () => {
    const input = toQuickAddCreateTaskInput({}, 'Plan weekend', ['work', 'home'], ['home', 'focus'])

    expect(input).toEqual({
      title: 'Plan weekend',
      dayDate: null,
      rondeled: false,
      bucket: null,
      tagIds: ['home', 'focus', 'work'],
    })
  })

  it('passes through explicit target values', () => {
    const input = toQuickAddCreateTaskInput(
      { dayDate: '2026-10-27', rondeled: true, bucket: 'bucket-list' },
      'Think long term',
      [],
      [],
    )

    expect(input).toEqual({
      title: 'Think long term',
      dayDate: '2026-10-27',
      rondeled: true,
      bucket: 'bucket-list',
      tagIds: [],
    })
  })
})
