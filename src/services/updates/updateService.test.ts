import {
  checkForUpdate,
  getRunningVersion,
  installUpdate,
  relaunchApp,
  UpdateServiceError,
  type AvailableUpdate,
} from './updateService'

const fake = vi.hoisted(() => {
  const updater = {
    check: vi.fn(),
  }
  const process = {
    relaunch: vi.fn(async () => undefined),
  }
  const app = {
    getVersion: vi.fn(async () => '0.1.0'),
  }
  return { updater, process, app }
})

vi.mock('@tauri-apps/plugin-updater', () => fake.updater)
vi.mock('@tauri-apps/plugin-process', () => fake.process)
vi.mock('@tauri-apps/api/app', () => fake.app)

describe('updateService', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    consoleErrorSpy.mockRestore()
  })

  it('returns null when no update is available', async () => {
    fake.updater.check.mockResolvedValueOnce(null)

    await expect(checkForUpdate()).resolves.toBeNull()
  })

  it('maps an available update for callers', async () => {
    const update = {
      version: '0.2.0',
      currentVersion: '0.1.0',
      body: 'Release notes',
      date: '2026-11-04T01:02:03Z',
      downloadAndInstall: vi.fn(async () => undefined),
    }
    fake.updater.check.mockResolvedValueOnce(update)

    await expect(checkForUpdate()).resolves.toEqual({
      version: '0.2.0',
      currentVersion: '0.1.0',
      notes: 'Release notes',
      date: '2026-11-04T01:02:03Z',
      handle: update,
    })
  })

  it('maps network errors from check to offline', async () => {
    fake.updater.check.mockRejectedValueOnce(new Error('Network connection reset'))

    await expect(checkForUpdate()).rejects.toEqual(expect.objectContaining({ code: 'offline' }))
  })

  it('does nothing in browser mode and never calls updater', async () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

    await expect(checkForUpdate()).resolves.toBeNull()
    expect(fake.updater.check).not.toHaveBeenCalled()
  })

  it('maps Started/Progress/Finished to progress fractions', async () => {
    const handle = {
      downloadAndInstall: vi.fn(async (onEvent?: (event: unknown) => void) => {
        onEvent?.({ event: 'Started', data: { contentLength: 100 } })
        onEvent?.({ event: 'Progress', data: { chunkLength: 30 } })
        onEvent?.({ event: 'Progress', data: { chunkLength: 70 } })
        onEvent?.({ event: 'Finished' })
      }),
    }
    const update: AvailableUpdate = {
      version: '0.2.0',
      currentVersion: '0.1.0',
      notes: '',
      date: null,
      handle,
    }

    const progress: Array<number | null> = []
    await installUpdate(update, (fraction) => progress.push(fraction))

    expect(progress).toEqual([0, 0.3, 1, 1])
    expect(handle.downloadAndInstall).toHaveBeenCalledTimes(1)
  })

  it('reports null progress when size is unknown', async () => {
    const handle = {
      downloadAndInstall: vi.fn(async (onEvent?: (event: unknown) => void) => {
        onEvent?.({ event: 'Started', data: {} })
        onEvent?.({ event: 'Progress', data: { chunkLength: 10 } })
        onEvent?.({ event: 'Finished' })
      }),
    }
    const update: AvailableUpdate = {
      version: '0.2.0',
      currentVersion: '0.1.0',
      notes: '',
      date: null,
      handle,
    }

    const progress: Array<number | null> = []
    await installUpdate(update, (fraction) => progress.push(fraction))

    expect(progress).toEqual([null, null, 1])
  })

  it('rejects updates with a missing install handle', async () => {
    const update: AvailableUpdate = {
      version: '0.2.0',
      currentVersion: '0.1.0',
      notes: '',
      date: null,
      handle: {},
    }

    await expect(installUpdate(update, vi.fn())).rejects.toEqual(expect.objectContaining({ code: 'unknown' }))
  })

  it('maps signature failures during install', async () => {
    const handle = {
      downloadAndInstall: vi.fn(async () => {
        throw new Error('signature verification failed')
      }),
    }
    const update: AvailableUpdate = {
      version: '0.2.0',
      currentVersion: '0.1.0',
      notes: '',
      date: null,
      handle,
    }

    await expect(installUpdate(update, vi.fn())).rejects.toEqual(expect.objectContaining({ code: 'bad-signature' }))
  })

  it('maps install/restart failures during install', async () => {
    const handle = {
      downloadAndInstall: vi.fn(async () => {
        throw new Error('install permission denied')
      }),
    }
    const update: AvailableUpdate = {
      version: '0.2.0',
      currentVersion: '0.1.0',
      notes: '',
      date: null,
      handle,
    }

    await expect(installUpdate(update, vi.fn())).rejects.toEqual(expect.objectContaining({ code: 'install-failed' }))
  })

  it('throws UpdateServiceError instances for callers that need typed handling', async () => {
    fake.updater.check.mockRejectedValueOnce(new Error('offline now'))

    await expect(checkForUpdate()).rejects.toBeInstanceOf(UpdateServiceError)
  })

  it('calls process.relaunch in desktop mode', async () => {
    await relaunchApp()

    expect(fake.process.relaunch).toHaveBeenCalledTimes(1)
  })

  it('reads the running app version from Tauri app API', async () => {
    await expect(getRunningVersion()).resolves.toBe('0.1.0')
    expect(fake.app.getVersion).toHaveBeenCalledTimes(1)
  })

  it('skips relaunch in browser mode', async () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

    await relaunchApp()
    expect(fake.process.relaunch).not.toHaveBeenCalled()
  })

  it('returns empty running version in browser mode', async () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

    await expect(getRunningVersion()).resolves.toBe('')
    expect(fake.app.getVersion).not.toHaveBeenCalled()
  })
})
