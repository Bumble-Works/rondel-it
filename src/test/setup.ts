import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

const store = new Map<string, string>()
const storage: Storage = {
  get length() {
    return store.size
  },
  clear() {
    store.clear()
  },
  getItem(key: string) {
    return store.has(key) ? store.get(key)! : null
  },
  key(index: number) {
    return [...store.keys()][index] ?? null
  },
  removeItem(key: string) {
    store.delete(key)
  },
  setItem(key: string, value: string) {
    store.set(key, value)
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage,
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  localStorage.clear()
})
