import type { ClientKeyEvent, ClientModule, ClientPointerEvent } from 'claude-code'

import { createTicker, type Ticker } from '../core/loop.ts'
import { BASE_TICK_MS, CELL_COLS, intervalFor, MAX_H, MAX_W, MIN_H, MIN_W } from './constants.ts'
import { createGame, start, step, togglePause, turn } from './engine.ts'
import { actionFor } from './input.ts'
import { renderSnake } from './renderer.tsx'
import type { SnakeState } from './types.ts'

type Props = { best?: number }
type State = { game: SnakeState; best: number; ticker: Ticker }
type SnakeSound = 'eat' | 'turn' | 'gameover'
// post() carries at most one message per frame (a later post replaces it), so
// best + a sound event ride together; the ui.message hook persists and plays.
type Post = { best?: number; sound?: SnakeSound }

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

// Chrome budget: header + scoreboard + hint (3 rows) + the board's bold border
// (2 rows, 2 cols) + outer paddingX (2 cols). The rest is playable cells.
function sizeFor(cols: number, rows: number): { w: number; h: number } {
  return {
    w: clamp(Math.floor((cols - 4) / CELL_COLS), MIN_W, MAX_W),
    h: clamp(rows - 6, MIN_H, MAX_H),
  }
}

// The Snake surface module: owns the game loop (surface.every), keyboard
// (surface.onKey), lifecycle (ready/running/paused/game_over) and drawing. It
// delegates all rules to the pure engine and all timing to the pure ticker.
const Snake: ClientModule<Props, State> = (props, surface) => {
  const { Text } = surface.elements

  if (surface.state !== undefined) return renderSnake(surface.elements, surface.state)

  // First call: wire timers and input once, after the region has a size.
  if (surface.columns === 0 || surface.rows === 0) return <Text color="#59636f">Loading…</Text>

  const { w: boardW, h: boardH } = sizeFor(surface.columns, surface.rows)
  const init: State = {
    game: createGame(boardW, boardH, Math.random),
    best: props.best ?? 0,
    ticker: createTicker(),
  }

  surface.every(BASE_TICK_MS, () => {
    const st = surface.state
    if (!st || st.game.status !== 'running') return
    const steps = st.ticker.advance(BASE_TICK_MS, intervalFor(st.game.score))
    if (steps === 0) return
    let g = st.game
    for (let i = 0; i < steps && g.status === 'running'; i++) g = step(g, Math.random)
    const best = Math.max(st.best, g.score)
    const msg: Post = {}
    if (best > st.best) msg.best = best // persist every new high, so exit never loses it
    if (g.status === 'game_over') msg.sound = 'gameover'
    else if (g.score > st.game.score) msg.sound = 'eat'
    if (msg.best !== undefined || msg.sound) surface.post(msg)
    surface.setState({ ...st, game: g, best })
  })

  surface.onKey((e: ClientKeyEvent) => {
    const st = surface.state
    if (!st) return
    const a = actionFor(e)
    if (!a) return
    let g = st.game
    if (a.kind === 'turn') {
      if (g.status === 'ready') g = start(g)
      const before = g.queued
      g = turn(g, a.dir)
      if (g.queued !== before) surface.post({ sound: 'turn' })
    } else if (a.kind === 'pause') {
      g = togglePause(g)
    } else {
      st.ticker.reset()
      g = start(createGame(g.width, g.height, Math.random))
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
      surface.setState({
        ...st,
        game: start(createGame(st.game.width, st.game.height, Math.random)),
      })
    }
  })

  surface.setState(init)
  return renderSnake(surface.elements, init)
}

export default Snake
