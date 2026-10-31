import { expect, test } from 'claude-code/testing'

import { textToFrame, textToRaster, textWidth } from './font.ts'
import { spriteDims } from './sprite.ts'

test('a glyph is 3×5 and text composes with 1-column gaps', async () => {
  expect(spriteDims(textToFrame('A'))).toEqual({ w: 3, h: 5 })
  expect(spriteDims(textToFrame('AB'))).toEqual({ w: 7, h: 5 }) // 3 + 1 + 3
  expect(textWidth('AB')).toBe(7)
})

test('unknown characters render as a blank, not a crash', async () => {
  expect(spriteDims(textToFrame('A@B'))).toEqual({ w: 11, h: 5 }) // 3+1+3+1+3
})

test('textToRaster returns a valid raster (5px tall → 3 cell rows)', async () => {
  const r = textToRaster('DRAW', '#ffffff')
  expect(r.rows).toBe(3)
  expect(/^[A-Za-z0-9+/]+={0,2}$/.test(r.cells)).toBe(true)
})
