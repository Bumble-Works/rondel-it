import { toQuickAddCreateTaskInput } from './quickAddInput'

describe('toQuickAddCreateTaskInput', () => {
  it('only includes a reminder for a real dated task', () => {
    expect(toQuickAddCreateTaskInput({ dayDate: '2026-10-28' }, 'Call', [], [], '10:00'))
      .toMatchObject({ reminderTime: '10:00' })
    for (const target of [{}, { bucket: 'bucket-list' as const }, { dayDate: '2026-10-28', rondeled: true }]) {
      expect(toQuickAddCreateTaskInput(target, 'Call', [], [], '10:00')).not.toHaveProperty('reminderTime')
    }
  })

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
