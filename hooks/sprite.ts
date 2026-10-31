// Pixel-art → terminal Raster. A frame is rows of single-char pixels; a palette
// maps each char to a hex colour or null (transparent). Two vertical pixels pack
// into one cell with a half-block, so a transparent pixel becomes the terminal's
// default colour and the sprite blends with the CLI background.

export type Palette = Record<string, string | null>
export type Frame = readonly string[]

const UPPER_HALF = 0x2580 // ▀  top pixel = fg, bottom = bg
const LOWER_HALF = 0x2584 // ▄  bottom pixel = fg, top = bg
const SPACE = 0x20 // blank: both pixels transparent
const DEFAULT = 0x01000000 // terminal's default colour (bit 24)

function colorOf(palette: Palette, ch: string | undefined): number | null {
  const hex = ch === undefined ? null : palette[ch]
  if (!hex) return null // transparent (unknown chars included)
  return parseInt(hex.slice(1), 16) & 0xffffff
}

export function spriteDims(frame: Frame): { w: number; h: number } {
  const h = frame.length
  const w = h === 0 ? 0 : Math.max(...frame.map(r => r.length))
  return { w, h }
}

// Row-major [codePoint, fg, bg] triplets, one cell per two stacked pixels.
export function spriteToWords(frame: Frame, palette: Palette): Uint32Array {
  const { w, h } = spriteDims(frame)
  const rows = Math.ceil(h / 2)
  const words = new Uint32Array(w * rows * 3)
  let o = 0
  for (let ry = 0; ry < rows; ry++) {
    const topRow = frame[ry * 2]
    const botRow = frame[ry * 2 + 1]
    for (let x = 0; x < w; x++) {
      const top = colorOf(palette, topRow?.[x])
      const bot = colorOf(palette, botRow?.[x])
      let ch = SPACE
      let fg = DEFAULT
      let bg = DEFAULT
      if (top !== null && bot !== null) {
        ch = UPPER_HALF
        fg = top
        bg = bot
      } else if (top !== null) {
        ch = UPPER_HALF
        fg = top // bottom stays terminal-default (transparent)
      } else if (bot !== null) {
        ch = LOWER_HALF
        fg = bot // top stays terminal-default (transparent)
      }
      words[o++] = ch
      words[o++] = fg
      words[o++] = bg
    }
  }
  return words
}

function toBase64(words: Uint32Array): string {
  const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength)
  // toBase64 is the engine's documented encoder (not in the es2023 lib types).
  return (bytes as Uint8Array & { toBase64(): string }).toBase64()
}

export function spriteToRaster(
  frame: Frame,
  palette: Palette,
): { columns: number; rows: number; cells: string } {
  const { w, h } = spriteDims(frame)
  return {
    columns: w,
    rows: Math.ceil(h / 2),
    cells: toBase64(spriteToWords(frame, palette)),
  }
}
