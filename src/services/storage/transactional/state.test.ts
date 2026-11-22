import { EMPTY_META, type Snapshot } from '../../../domain/sync'
import { assertState, nextState, type StoreState } from './state'
const snapshot = (): Snapshot => ({ tasks: [], tags: [], rules: [], settings: null, meta: structuredClone(EMPTY_META) })
const initial = (): StoreState => ({ active: { snapshot: snapshot(), revision: 0, epoch: 0 }, previous: null, control: { epoch: 0, syncHeld: false } })

it('checkpoints exact data and keeps hold/predecessor across ordinary edits', () => {
  const old = initial()
  const restored = nextState(old, old.active, data => ({ ...data, settings: { weekStartDay: 1 } }), true)
  expect(restored.previous).toEqual(old.active)
  expect(restored.control).toEqual({ epoch: 1, syncHeld: true })
  const edited = nextState(restored, restored.active, data => ({ ...data, settings: null }))
  expect(edited.active.snapshot.settings).toBeNull()
  expect(edited.previous).toEqual(old.active)
  expect(edited.control).toEqual(restored.control)
  expect(old).toEqual(initial())
})
it('rejects stale revisions and epochs without invoking a transform', () => {
  const transform = vi.fn(snapshot)
  expect(() => nextState(initial(), { revision: 1, epoch: 0 }, transform)).toThrow('Data changed')
  expect(() => nextState(initial(), { revision: 0, epoch: 1 }, transform)).toThrow('Data changed')
  expect(transform).not.toHaveBeenCalled()
})
it('detaches transform arguments and outputs', () => {
  const state = initial()
  const returned = nextState(state, state.active, data => { data.tags.push({ id: 't', name: 'Tag', color: '#000' }); return data })
  returned.active.snapshot.tags[0].name = 'changed'
  expect(state.active.snapshot.tags).toEqual([])
})
it('rejects corrupt envelopes, invalid transforms and counter overflow', () => {
  expect(() => assertState({ ...initial(), control: { epoch: 2, syncHeld: false } })).toThrow()
  expect(() => nextState(initial(), initial().active, () => null as unknown as Snapshot)).toThrow()
  const state = initial(); state.active.revision = Number.MAX_SAFE_INTEGER
  expect(() => nextState(state, state.active, data => data)).toThrow()
})
it('propagates synchronous transform failures without changing state', () => {
  const state = initial()
  expect(() => nextState(state, state.active, data => { data.tags.length = 0; throw new Error('failed') })).toThrow('failed')
  expect(state).toEqual(initial())
})
it('accepts a released sync hold after a checkpoint but still requires the predecessor', () => {
  const old = initial()
  const restored = nextState(old, old.active, data => data, true)
  expect(() => assertState({ ...restored, control: { ...restored.control, syncHeld: false } })).not.toThrow()
  expect(() => assertState({ ...restored, previous: null })).toThrow('Inconsistent')
})
