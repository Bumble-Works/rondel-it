/** A complete 24-hour time token at the caret; URLs and partial words stay text. */
export function timeTokenAt(text: string, caret: number): { start: number; time: string } | null {
  if (text[caret] && !/\s/.test(text[caret])) return null
  const match = /(?:^|\s)(@?([01]?\d|2[0-3]):([0-5]\d))$/.exec(text.slice(0, caret))
  return match ? { start: caret - match[1].length, time: `${match[2].padStart(2, '0')}:${match[3]}` } : null
}
