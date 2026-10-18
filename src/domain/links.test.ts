import { findLinks, linkLabel, splitLinks } from './links'

describe('links', () => {
  it('splits text around links', () => {
    expect(splitLinks('See https://example.com/a?b=1 for details')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'link', text: 'https://example.com/a?b=1', href: 'https://example.com/a?b=1' },
      { kind: 'text', text: ' for details' },
    ])
  })

  it('adds https:// to bare www. links', () => {
    expect(findLinks('go to www.example.com')).toEqual([{ text: 'www.example.com', href: 'https://www.example.com' }])
  })

  it('leaves trailing punctuation out of the link', () => {
    expect(findLinks('Docs: https://example.com/page.')).toEqual([{ text: 'https://example.com/page', href: 'https://example.com/page' }])
    expect(findLinks('(see https://example.com)')[0].href).toBe('https://example.com')
  })

  it('keeps a closing parenthesis that is part of the URL', () => {
    const url = 'https://en.wikipedia.org/wiki/Rondel_(poem)'
    expect(findLinks(`Read ${url}.`)[0].href).toBe(url)
  })

  it('finds several links and ignores text without any', () => {
    expect(findLinks('a http://one.test b https://two.test').map((l) => l.href)).toEqual(['http://one.test', 'https://two.test'])
    expect(splitLinks('no links here')).toEqual([{ kind: 'text', text: 'no links here' }])
  })

  it('shows links short: no scheme or www, long ones trimmed', () => {
    expect(linkLabel('https://www.example.com/')).toBe('example.com')
    expect(linkLabel('http://example.com/a')).toBe('example.com/a')
    const long = linkLabel('https://docs.example.com/guides/getting-started/install?ref=abc')
    expect(long).toBe('docs.example.com/guides/getting…')
    expect(long).toHaveLength(32)
  })
})
