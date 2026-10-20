import { isWindows, platformWords } from './platform'

const asUserAgent = (ua: string) => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)

describe('platform', () => {
  it('uses Windows names on Windows', () => {
    asUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/130.0')
    expect(isWindows()).toBe(true)
    expect(platformWords()).toEqual({ fileManager: 'File Explorer', trayIcon: 'system tray icon' })
  })

  it('uses Mac names elsewhere', () => {
    asUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')
    expect(isWindows()).toBe(false)
    expect(platformWords().fileManager).toBe('Finder')
  })
})
