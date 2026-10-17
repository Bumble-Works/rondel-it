import type { Tag } from './types'

/** The `#word` being typed right before the caret, if any. */
export function hashQueryAt(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)#([^\s#]*)$/.exec(text.slice(0, caret))
  if (!match) return null
  return { start: caret - match[2].length - 1, query: match[2] }
}

export function findTagByName(tags: Tag[], name: string): Tag | undefined {
  const wanted = name.trim().toLowerCase()
  return tags.find((t) => t.name.toLowerCase() === wanted)
}

/** Case-insensitive matches; tags starting with the query come first. */
export function matchTags(tags: Tag[], query: string, limit = 6): Tag[] {
  const q = query.toLowerCase()
  const hits = tags.filter((t) => t.name.toLowerCase().includes(q))
  const starts = hits.filter((t) => t.name.toLowerCase().startsWith(q))
  return [...starts, ...hits.filter((t) => !starts.includes(t))].slice(0, limit)
}

/** Removes the `#word` token from the title and tidies the spacing. */
export function removeHashToken(text: string, start: number, caret: number): { text: string; caret: number } {
  const before = text.slice(0, start).replace(/\s+$/, '')
  const after = text.slice(caret).replace(/^\s+/, '')
  const joined = before && after ? `${before} ${after}` : before || after
  return { text: joined, caret: before.length + (before && after ? 1 : 0) }
}
