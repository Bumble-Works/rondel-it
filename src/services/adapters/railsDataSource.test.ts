import { railsDataSource } from './railsDataSource'

function ok(payload: unknown): Response {
  return { ok: true, json: async () => payload } as Response
}

function bad(payload: unknown): Response {
  return { ok: false, json: async () => payload } as Response
}

function noContent(): Response {
  return {
    ok: true,
    status: 204,
    json: async () => {
      throw new Error('no body')
    },
  } as unknown as Response
}

function taskPayload(id: string, tagIds: string[] = []): Record<string, unknown> {
  return {
    id,
    title: `Task ${id}`,
    status: 'todo',
    dayDate: '2026-09-20',
    rondeled: false,
    bucket: null,
    position: 0,
    rondelCount: 0,
    tagIds,
    note: '',
    createdAt: '2026-09-15T00:00:00.000Z',
    completedAt: null,
    recurringRuleId: null,
  }
}

describe('railsDataSource', () => {
  it('listTasksInRange and listBucketTasks request expected endpoints and filter tags', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ tasks: [taskPayload('a', ['x']), taskPayload('b', ['y'])] }))
      .mockResolvedValueOnce(ok({ tasks: [taskPayload('c', ['x'])] }))
    vi.stubGlobal('fetch', fetchMock)

    const range = await railsDataSource.listTasksInRange('2026-09-01', '2026-09-30', 'x')
    const bucket = await railsDataSource.listBucketTasks('bucket-list', 'x')

    expect(range.map((t) => t.id)).toEqual(['a'])
    expect(bucket.map((t) => t.id)).toEqual(['c'])
    expect(fetchMock.mock.calls[0][0]).toContain('/tasks?start=2026-09-01&end=2026-09-30')
    expect(fetchMock.mock.calls[1][0]).toContain('/tasks?bucket=bucket-list')
  })

  it('covers task mutation endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ task: taskPayload('1') })) // create
      .mockResolvedValueOnce(ok({ task: taskPayload('1') })) // update
      .mockResolvedValueOnce(ok({ task: taskPayload('1') })) // advance
      .mockResolvedValueOnce(ok({ task: taskPayload('1') })) // set status
      .mockResolvedValueOnce(ok({ task: taskPayload('1') })) // move
      .mockResolvedValueOnce(noContent()) // delete
    vi.stubGlobal('fetch', fetchMock)

    await railsDataSource.createTask({
      title: 'Task',
      dayDate: '2026-09-20',
      rondeled: false,
      bucket: null,
      tagIds: ['x'],
    })
    await railsDataSource.updateTask('1', { title: 'Task+', tagIds: ['x'], note: 'n' })
    await railsDataSource.advanceTask('1')
    await railsDataSource.setTaskStatus('1', 'doing')
    await railsDataSource.moveTask('1', { dayDate: '2026-09-22', rondeled: true, bucket: null }, { beforeId: '2', rondel: true })
    await railsDataSource.deleteTask('1')

    expect(fetchMock.mock.calls[0][0]).toContain('/tasks')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        title: 'Task',
        day_date: '2026-09-20',
        rondeled: false,
        bucket: null,
        tag_ids: ['x'],
      }),
    })
    expect(fetchMock.mock.calls[1][0]).toContain('/tasks/1')
    expect(fetchMock.mock.calls[2][0]).toContain('/tasks/1/advance')
    expect(fetchMock.mock.calls[3][0]).toContain('/tasks/1/status')
    expect(fetchMock.mock.calls[4][0]).toContain('/tasks/1/move')
    expect(fetchMock.mock.calls[5][0]).toContain('/tasks/1')
    expect(fetchMock.mock.calls[5][1]).toMatchObject({ method: 'DELETE' })
  })

  it('covers tags, settings, and recurring endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ tags: [{ id: 't1', name: 'A', color: '#fff' }] }))
      .mockResolvedValueOnce(ok({ tag: { id: 't2', name: 'B', color: '#000' } }))
      .mockResolvedValueOnce(ok({ tag: { id: 't2', name: 'B+', color: '#000' } }))
      .mockResolvedValueOnce(ok({ ok: true }))
      .mockResolvedValueOnce(ok({ settings: { weekStartDay: 1, dayStartTime: '09:00', endOfDayTime: '17:00', timezone: 'UTC' } }))
      .mockResolvedValueOnce(ok({ settings: { weekStartDay: 0, dayStartTime: '09:00', endOfDayTime: '18:00', timezone: 'UTC' } }))
      .mockResolvedValueOnce(ok({ rules: [{ id: 'r1', title: 'R', tagIds: [], note: '', kind: 'weekly-start', weekday: null, dayOfMonth: null, createdAt: '', lastRunDate: null }] }))
      .mockResolvedValueOnce(ok({ rule: { id: 'r2', title: 'R2', tagIds: [], note: '', kind: 'weekly-on', weekday: 2, dayOfMonth: null, createdAt: '', lastRunDate: null } }))
      .mockResolvedValueOnce(ok({ rule: { id: 'r2', title: 'R2+', tagIds: [], note: '', kind: 'weekly-on', weekday: 3, dayOfMonth: null, createdAt: '', lastRunDate: null } }))
      .mockResolvedValueOnce(ok({ ok: true }))
      .mockResolvedValueOnce(ok({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await railsDataSource.listTags()
    await railsDataSource.createTag({ name: 'B', color: '#000' })
    await railsDataSource.updateTag('t2', { name: 'B+' })
    await railsDataSource.deleteTag('t2')
    await railsDataSource.getSettings()
    await railsDataSource.updateSettings({ weekStartDay: 0, endOfDayTime: '18:00' })
    await railsDataSource.listRecurringRules()
    await railsDataSource.createRecurringRule({ title: 'R2', kind: 'weekly-on', weekday: 2 })
    await railsDataSource.updateRecurringRule('r2', { weekday: 3 })
    await railsDataSource.deleteRecurringRule('r2')
    await railsDataSource.syncRecurring('2026-09-30')

    expect(fetchMock.mock.calls[0][0]).toContain('/tags')
    expect(fetchMock.mock.calls[4][0]).toContain('/settings')
    // Rails permits snake_case params.
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({ week_start_day: 0, end_of_day_time: '18:00' })
    expect(JSON.parse(fetchMock.mock.calls[7][1].body)).toMatchObject({ kind: 'weekly-on', weekday: 2 })
    expect(fetchMock.mock.calls[6][0]).toContain('/recurring_rules')
    expect(fetchMock.mock.calls[10][0]).toContain('/recurring_rules/sync')
  })

  it('surfaces API errors and fallback request errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(bad({ error: 'Nope' })).mockResolvedValueOnce(bad({})))
    await expect(railsDataSource.listRondelItems()).rejects.toThrow('Nope')
    await expect(railsDataSource.listRondelItems()).rejects.toThrow('Request failed')
  })

  it('throws a clear error when a successful response is not JSON', async () => {
    const notJson = {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    } as unknown as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(notJson))
    await expect(railsDataSource.listTags()).rejects.toThrow('Invalid JSON response from /tags')
  })
})
