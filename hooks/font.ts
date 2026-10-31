import type { Frame } from './sprite.ts'
import { spriteToRaster } from './sprite.ts'

// A compact 3×5 pixel font ('#' = ink, '.' = transparent). Enough for the short
// status words and the scoreboard; unknown characters render as a blank.

const GLYPH_H = 5
const GAP = 1

const FONT: Record<string, readonly string[]> = {
  ' ': ['...', '...', '...', '...', '...'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '.': ['...', '...', '...', '...', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
  "'": ['.#.', '.#.', '...', '...', '...'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  A: ['###', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['###', '#..', '#..', '#..', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['###', '#..', '#.#', '#.#', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '###'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['#.#', '###', '###', '###', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  P: ['###', '#.#', '###', '#..', '#..'],
  Q: ['###', '#.#', '#.#', '###', '..#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
}

// Compose text into one pixel frame (5 rows), 1-column gaps between glyphs.
export function textToFrame(text: string): Frame {
  const rows = Array.from({ length: GLYPH_H }, () => '')
  ;[...text.toUpperCase()].forEach((ch, idx) => {
    const glyph = FONT[ch] ?? FONT[' ']
    for (let r = 0; r < GLYPH_H; r++) {
      rows[r] += (idx > 0 ? '.'.repeat(GAP) : '') + (glyph?.[r] ?? '...')
    }
  })
  return rows
}

export function textToRaster(
  text: string,
  color: string,
): { columns: number; rows: number; cells: string } {
  return spriteToRaster(textToFrame(text), { '.': null, '#': color })
}

// Width in columns the text will occupy, to check it fits before drawing.
export function textWidth(text: string): number {
  const n = text.length
  return n === 0 ? 0 : n * 3 + (n - 1) * GAP
}
