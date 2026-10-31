import { expect, test } from 'claude-code/testing'

import { getTheme, isThemeId, nextTheme, THEME_IDS } from './themes.ts'

test('every registered theme has a full, non-empty palette', async () => {
  for (const id of THEME_IDS) {
    const t = getTheme(id)
    expect(t.id).toBe(id)
    for (const key of ['name', 'tag', 'brand', 'border', 'tileA', 'tileB', 'x', 'o', 'win', 'bg', 'dim'] as const) {
      expect(typeof t[key]).toBe('string')
      expect(t[key].length > 0).toBe(true)
    }
  }
})

test('Classic is the default and the fallback for unknown ids', async () => {
  expect(getTheme('bogus').id).toBe('classic')
  expect(getTheme(undefined).id).toBe('classic')
  expect(getTheme(42).id).toBe('classic')
})

test('isThemeId accepts known ids and rejects the rest', async () => {
  expect(isThemeId('halloween')).toBe(true)
  expect(isThemeId('nope')).toBe(false)
  expect(isThemeId(null)).toBe(false)
})

test('nextTheme cycles through every theme and wraps', async () => {
  const start = THEME_IDS[0] ?? 'classic'
  const seen: string[] = [start]
  let cur: string = start
  for (let i = 0; i < THEME_IDS.length; i++) {
    cur = nextTheme(cur)
    seen.push(cur)
  }
  // After N steps we are back at the start, having visited all ids.
  expect(cur).toBe(start)
  expect(new Set(seen).size).toBe(THEME_IDS.length)
})
