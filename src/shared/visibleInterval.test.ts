import { startVisibleInterval } from './visibleInterval'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('startVisibleInterval', () => {
  afterEach(() => setHidden(false))

  it('ticks while visible, stops while hidden, and catches up when shown', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const stop = startVisibleInterval(fn, 1000)

    vi.advanceTimersByTime(2000)
    expect(fn).toHaveBeenCalledTimes(2)

    setHidden(true)
    vi.advanceTimersByTime(10_000)
    expect(fn).toHaveBeenCalledTimes(2)

    setHidden(false) // runs once right away
    expect(fn).toHaveBeenCalledTimes(3)
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(4)

    stop()
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(4)
  })
})
