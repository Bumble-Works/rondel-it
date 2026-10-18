export type TextPart = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string }

// http(s):// or www. up to whitespace; trailing punctuation is left as text.
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi
const PUNCTUATION = '.,;:!?\'"]}'

const count = (text: string, char: string) => text.split(char).length - 1

/** Drops trailing punctuation, keeping a ")" that closes a "(" in the URL. */
function trimUrl(url: string): string {
  let end = url.length
  while (end > 0) {
    const char = url[end - 1]
    const head = url.slice(0, end)
    if (char === ')' && count(head, '(') >= count(head, ')')) break
    if (char !== ')' && !PUNCTUATION.includes(char)) break
    end--
  }
  return url.slice(0, end)
}

/** Splits text into plain parts and links (bare "www." links get https://). */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0])

    const start = match.index ?? 0
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) })
    parts.push({ kind: 'link', text: url, href: /^www\./i.test(url) ? `https://${url}` : url })
    last = start + url.length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}

export function findLinks(text: string): Array<{ text: string; href: string }> {
  return splitLinks(text).flatMap((p) => (p.kind === 'link' ? [{ text: p.text, href: p.href }] : []))
}

const MAX_LINK_LABEL = 32

/** How a link is shown: no "https://www.", and long ones trimmed with "…". */
export function linkLabel(url: string): string {
  const short = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
  return short.length > MAX_LINK_LABEL ? `${short.slice(0, MAX_LINK_LABEL - 1)}…` : short
}
