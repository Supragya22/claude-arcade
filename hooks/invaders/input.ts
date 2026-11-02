import type { ClientKeyEvent } from 'claude-code'

export type Action =
  | { kind: 'move'; dx: -1 | 1 }
  | { kind: 'fire' }
  | { kind: 'pause' }
  | { kind: 'new' }

// Arrows + A/D move, Space fires, P pauses, N starts a new game. Space arrives
// as the typed ' ' character; 'space' is handled defensively.
const KEYS: Record<string, Action> = {
  left: { kind: 'move', dx: -1 },
  a: { kind: 'move', dx: -1 },
  right: { kind: 'move', dx: 1 },
  d: { kind: 'move', dx: 1 },
  ' ': { kind: 'fire' },
  space: { kind: 'fire' },
  p: { kind: 'pause' },
  n: { kind: 'new' },
}

export function actionFor(e: ClientKeyEvent): Action | null {
  if (e.ctrl || e.meta) return null
  return KEYS[e.key.toLowerCase()] ?? null
}
