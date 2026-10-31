import { FOOD_POINTS, START_LEN } from './constants.ts'
import type { Dir, Point, Rng, SnakeState } from './types.ts'

const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

const eq = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y

export function freeCells(width: number, height: number, taken: readonly Point[]): Point[] {
  const occ = new Set(taken.map(p => p.y * width + p.x))
  const out: Point[] = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (!occ.has(y * width + x)) out.push({ x, y })
  return out
}

export function placeFood(
  width: number,
  height: number,
  snake: readonly Point[],
  rng: Rng,
): Point {
  const free = freeCells(width, height, snake)
  // ponytail: board full -> food sits on the head; effectively a win with no
  // explicit win state. Only reachable when the snake fills the grid. Fine.
  if (free.length === 0) return snake[0] ?? { x: 0, y: 0 }
  const i = Math.min(free.length - 1, Math.floor(rng() * free.length))
  return free[i]!
}

export function createGame(width: number, height: number, rng: Rng): SnakeState {
  const y = Math.floor(height / 2)
  const headX = Math.floor(width / 2)
  const snake: Point[] = []
  for (let i = 0; i < START_LEN; i++) snake.push({ x: headX - i, y }) // head first, facing right
  return {
    width,
    height,
    snake,
    dir: 'right',
    queued: null,
    food: placeFood(width, height, snake, rng),
    score: 0,
    status: 'ready',
  }
}

// Queue a direction change, ignoring no-ops and 180° reversals of the committed
// heading. At most one change lands per step (the queue holds one).
export function turn(s: SnakeState, dir: Dir): SnakeState {
  if (s.status !== 'running' && s.status !== 'ready') return s
  if (dir === s.dir || dir === OPPOSITE[s.dir]) return s
  return { ...s, queued: dir }
}

export function start(s: SnakeState): SnakeState {
  return s.status === 'ready' || s.status === 'paused' ? { ...s, status: 'running' } : s
}

export function togglePause(s: SnakeState): SnakeState {
  if (s.status === 'running') return { ...s, status: 'paused' }
  if (s.status === 'paused') return { ...s, status: 'running' }
  return s
}

export function step(s: SnakeState, rng: Rng): SnakeState {
  if (s.status !== 'running') return s
  const dir = s.queued ?? s.dir
  const d = DELTA[dir]
  const head = s.snake[0]!
  const next: Point = { x: head.x + d.x, y: head.y + d.y }

  if (next.x < 0 || next.y < 0 || next.x >= s.width || next.y >= s.height)
    return { ...s, dir, queued: null, status: 'game_over' }

  const eating = eq(next, s.food)
  // The tail cell is free this tick unless we grow into it.
  const body = eating ? s.snake : s.snake.slice(0, -1)
  if (body.some(p => eq(p, next))) return { ...s, dir, queued: null, status: 'game_over' }

  const snake = [next, ...body]
  const score = eating ? s.score + FOOD_POINTS : s.score
  const food = eating ? placeFood(s.width, s.height, snake, rng) : s.food
  return { ...s, snake, dir, queued: null, score, food, status: 'running' }
}
