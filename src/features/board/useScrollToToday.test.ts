import { renderHook } from '@testing-library/react'
import { useScrollToToday } from './useScrollToToday'

describe('useScrollToToday', () => {
  let scrolled: Element[]

  beforeEach(() => {
    scrolled = []
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this)
    }
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    document.body.innerHTML = '<section class="board-section"></section><section class="board-section is-highlight" id="today"></section>'
  })

  afterEach(() => {
    // jsdom has no scrollIntoView; don't leave the stub for other tests.
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  it("scrolls today's section into view when the shown period contains today", () => {
    renderHook(() => useScrollToToday(true, 'week:2026-10-12'))
    expect(scrolled.map((el) => el.id)).toEqual(['today'])
  })

  it("doesn't scroll for a period without today", () => {
    renderHook(() => useScrollToToday(false, 'week:2026-10-19'))
    expect(scrolled).toEqual([])
  })

  it('scrolls again only when the period changes', () => {
    const { rerender } = renderHook(({ key }) => useScrollToToday(true, key), { initialProps: { key: 'week:a' } })
    rerender({ key: 'week:a' })
    rerender({ key: 'month:a' })
    expect(scrolled).toHaveLength(2)
  })
})
