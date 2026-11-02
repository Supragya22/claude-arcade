import type { ClientKeyEvent, ClientModule, ClientPointerEvent } from 'claude-code'

import { createTicker, type Ticker } from '../core/loop.ts'
import { BASE_TICK_MS, CELL_COLS, FILL_H, MAX_H, MAX_W, MIN_H, MIN_W, STEP_MS } from './constants.ts'
import { createGame, fire, movePlayer, start, step, togglePause } from './engine.ts'
import { actionFor } from './input.ts'
import { renderInvaders } from './renderer.tsx'
import type { InvadersState } from './types.ts'

type Props = { best?: number; save?: InvadersState } // `save` resumes a minimised game
type State = { game: InvadersState; best: number; ticker: Ticker }
type InvadersSound = 'shoot' | 'explode' | 'ufo' | 'march' | 'gameover'
// post() carries at most one message per frame (a later post replaces it), so
// best + a sound event + the game snapshot ride together; the ui.message hook
// persists best/plays sound and keeps the game so a minimise can resume it.
type Post = { best?: number; sound?: InvadersSound; game?: InvadersState }

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

// The formation's top-left corner; a change over a frame means it marched.
function formationSig(g: InvadersState): string {
  if (g.enemies.length === 0) return 'none'
  let minX = Infinity
  let minY = Infinity
  for (const e of g.enemies) {
    if (e.x < minX) minX = e.x
    if (e.y < minY) minY = e.y
  }
  return `${minX}:${minY}`
}

// Which sound a frame earned: game over > mystery-ship bonus > kill > march.
function soundFor(prev: InvadersState, next: InvadersState): InvadersSound | undefined {
  if (next.status === 'game_over' && prev.status !== 'game_over') return 'gameover'
  if (next.lives < prev.lives) return 'explode' // the ship took a hit
  if (prev.ufo && !next.ufo && next.score > prev.score) return 'ufo'
  if (next.score > prev.score) return 'explode'
  if (next.enemies.length === prev.enemies.length && formationSig(prev) !== formationSig(next)) return 'march'
  return undefined
}

// Header + scoreboard + hint (3 rows) + the board's bold border (2 rows, 2 cols)
// + outer paddingX (2 cols). The rest is playable cells.
function sizeFor(cols: number, rows: number): { w: number; h: number } {
  return {
    w: clamp(Math.floor((cols - 4) / CELL_COLS), MIN_W, MAX_W),
    // Height from a fixed target (floor), not the content-sized region, else it
    // collapses; the pane grows to fit. rows-6 only wins if a bigger region appears.
    h: clamp(Math.max(FILL_H, rows - 6), MIN_H, MAX_H),
  }
}

// The Invaders surface module: owns the game loop (surface.every), keyboard
// (surface.onKey), lifecycle and drawing. Rules go to the pure engine, timing to
// the pure ticker — one timer per instance, reused across waves and restarts.
const Invaders: ClientModule<Props, State> = (props, surface) => {
  const { Text } = surface.elements

  if (surface.state !== undefined) return renderInvaders(surface.elements, surface.state)

  // First call: wire timers and input once, after the region has a size.
  if (surface.columns === 0 || surface.rows === 0) return <Text color="#59636f">Loading…</Text>

  const { w: boardW, h: boardH } = sizeFor(surface.columns, surface.rows)
  // Resume a minimised game (frozen as paused); otherwise start fresh.
  const saved = props.save
  const initGame: InvadersState = saved
    ? saved.status === 'running' || saved.status === 'wave_cleared'
      ? { ...saved, status: 'paused' }
      : saved
    : createGame(boardW, boardH)
  const init: State = {
    game: initGame,
    best: props.best ?? 0,
    ticker: createTicker(),
  }

  // No key-release events, so hold-to-glide isn't possible; instead, rapid
  // same-direction presses (terminal auto-repeat) step two cells for momentum.
  let lastMoveAt = 0
  let lastDir = 0
  // Snapshot the game only a few times a second (for minimise-resume), not every
  // frame — per-frame posting hitches the draw thread and the sim catches up in jumps.
  let saveTick = 0

  surface.every(BASE_TICK_MS, () => {
    const st = surface.state
    if (!st) return
    const active = st.game.status === 'running' || st.game.status === 'wave_cleared'
    if (!active) return
    const steps = st.ticker.advance(BASE_TICK_MS, STEP_MS)
    if (steps === 0) return
    const prev = st.game
    let g = prev
    for (let i = 0; i < steps; i++) {
      if (g.status !== 'running' && g.status !== 'wave_cleared') break
      g = step(g, Math.random)
    }
    const best = Math.max(st.best, g.score)
    const msg: Post = {}
    if (best > st.best) msg.best = best // persist every new high, so exit never loses it
    const snd = soundFor(prev, g)
    if (snd) msg.sound = snd
    // Save the game ~3×/sec, and on notable frames (a kill/hit/game-over), so a
    // minimise resumes a recent state without posting every frame.
    if (saveTick++ % 6 === 0 || snd) msg.game = g
    if (msg.best !== undefined || msg.sound || msg.game) surface.post(msg)
    surface.setState({ ...st, game: g, best })
  })

  surface.onKey((e: ClientKeyEvent) => {
    const st = surface.state
    if (!st) return
    const a = actionFor(e)
    if (!a) return
    let g = st.game
    if (a.kind === 'new') {
      st.ticker.reset()
      g = createGame(g.width, g.height)
    } else if (a.kind === 'pause') {
      g = togglePause(g)
    } else if (a.kind === 'move') {
      if (g.status === 'ready') g = start(g) // first move starts the game
      const now = Date.now()
      const fast = a.dx === lastDir && now - lastMoveAt < 90
      lastMoveAt = now
      lastDir = a.dx
      g = movePlayer(g, fast ? a.dx * 2 : a.dx)
    } else {
      if (g.status === 'ready') g = start(g) // first fire starts the game
      const before = g.pBullets.length
      g = fire(g)
      if (g.pBullets.length > before) surface.post({ sound: 'shoot' })
    }
    surface.setState({ ...st, game: g, best: Math.max(st.best, g.score) })
  })

  surface.onPointer((e: ClientPointerEvent) => {
    if (e.type !== 'down') return
    const st = surface.state
    if (!st) return
    if (st.game.status === 'ready') {
      surface.setState({ ...st, game: start(st.game) })
    } else if (st.game.status === 'game_over') {
      st.ticker.reset()
      surface.setState({ ...st, game: createGame(st.game.width, st.game.height) })
    }
  })

  surface.setState(init)
  return renderInvaders(surface.elements, init)
}

export default Invaders
