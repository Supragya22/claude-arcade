import type { ClientKeyEvent } from 'claude-code'

import type { Dir } from './types.ts'

export type Action = { kind: 'turn'; dir: Dir } | { kind: 'pause' } | { kind: 'new' }

const KEYS: Record<string, Action> = {
  up: { kind: 'turn', dir: 'up' },
  w: { kind: 'turn', dir: 'up' },
  down: { kind: 'turn', dir: 'down' },
  s: { kind: 'turn', dir: 'down' },
  left: { kind: 'turn', dir: 'left' },
  a: { kind: 'turn', dir: 'left' },
  right: { kind: 'turn', dir: 'right' },
  d: { kind: 'turn', dir: 'right' },
  p: { kind: 'pause' },
  n: { kind: 'new' },
}

// Maps a key to a game action; ignores anything modified or unbound. Reversal
// safety and the one-change-per-tick rule live in the engine, not here.
export function actionFor(e: ClientKeyEvent): Action | null {
  if (e.ctrl || e.meta) return null
  return KEYS[e.key.toLowerCase()] ?? null
}
