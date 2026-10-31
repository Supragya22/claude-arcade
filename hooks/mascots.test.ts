import { expect, test } from 'claude-code/testing'

import type { MascotState } from './mascots.ts'
import { mascotFor, pickFrame } from './mascots.ts'
import { spriteDims } from './sprite.ts'

const STATES: MascotState[] = ['idle', 'thinking', 'player_win', 'ai_win', 'draw']
const THEMES = ['classic', 'halloween', 'diwali', 'holi', 'eid', 'christmas']

test('every mascot: each state has frames of one consistent size, chars in palette', async () => {
  for (const id of THEMES) {
    const m = mascotFor(id)
    const palChars = new Set(Object.keys(m.palette))
    let dims: { w: number; h: number } | null = null
    for (const st of STATES) {
      const frames = m.frames[st]
      expect(frames.length > 0).toBe(true)
      for (const fr of frames) {
        const d = spriteDims(fr)
        dims = dims ?? d
        expect(d).toEqual(dims) // identical size across all frames = visual consistency
        for (const row of fr) {
          for (const ch of row) expect(palChars.has(ch)).toBe(true)
        }
      }
    }
  }
})

test('all mascots share the same 16×16 canvas', async () => {
  for (const id of THEMES) {
    expect(spriteDims(mascotFor(id).frames.idle[0] ?? [])).toEqual({ w: 16, h: 16 })
  }
})

test('unknown theme falls back to the classic mascot', async () => {
  expect(mascotFor('bogus')).toBe(mascotFor('classic'))
})

test('pickFrame cycles within a state and wraps', async () => {
  const m = mascotFor('classic')
  const n = m.frames.idle.length
  expect(pickFrame(m, 'idle', 0)).toBe(m.frames.idle[0])
  expect(pickFrame(m, 'idle', n)).toBe(m.frames.idle[0])
})
