import { expect, test } from 'claude-code/testing'

import type { Palette } from './sprite.ts'
import { spriteDims, spriteToRaster, spriteToWords } from './sprite.ts'

const P: Palette = { '.': null, R: '#ff0000', G: '#00ff00' }

test('dims are the longest row width and the row count', async () => {
  expect(spriteDims(['RG', 'R'])).toEqual({ w: 2, h: 2 })
  expect(spriteDims([])).toEqual({ w: 0, h: 0 })
})

test('each cell packs two stacked pixels into one [cp, fg, bg] triplet', async () => {
  // top "R." over bottom ".G"
  const words = Array.from(spriteToWords(['R.', '.G'], P))
  expect(words).toEqual([
    0x2580, 0xff0000, 0x01000000, // top set, bottom transparent → upper half
    0x2584, 0x00ff00, 0x01000000, // top transparent, bottom set → lower half
  ])
})

test('both pixels set → upper half with fg=top, bg=bottom', async () => {
  expect(Array.from(spriteToWords(['R', 'G'], P))).toEqual([0x2580, 0xff0000, 0x00ff00])
})

test('both pixels transparent → blank space in default colours', async () => {
  expect(Array.from(spriteToWords(['.', '.'], P))).toEqual([0x20, 0x01000000, 0x01000000])
})

test('raster reports columns, rows and a valid base64 cells string', async () => {
  const r = spriteToRaster(['RG', 'RG'], P) // 2×2 px → 2 cols × 1 row
  expect(r.columns).toBe(2)
  expect(r.rows).toBe(1)
  expect(r.cells.length).toBe(32) // 2 cells × 3 u32 × 4 bytes = 24 → base64 len 32
  expect(/^[A-Za-z0-9+/]+={0,2}$/.test(r.cells)).toBe(true)
})
