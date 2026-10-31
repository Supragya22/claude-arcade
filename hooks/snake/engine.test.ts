import { expect, test } from 'claude-code/testing'

import { intervalFor, MIN_INTERVAL_MS, START_INTERVAL_MS } from './constants.ts'
import { createGame, freeCells, placeFood, start, step, togglePause, turn } from './engine.ts'
import type { Point, SnakeState } from './types.ts'

const zero = () => 0 // deterministic RNG: always the first free cell
const run = (s: SnakeState): SnakeState => ({ ...s, status: 'running' })

test('initial snake: length 3, head centered, facing right, ready', async () => {
  const g = createGame(12, 10, zero)
  expect(g.snake.length).toBe(3)
  expect(g.snake[0]).toEqual({ x: 6, y: 5 })
  expect(g.snake[1]).toEqual({ x: 5, y: 5 })
  expect(g.dir).toBe('right')
  expect(g.status).toBe('ready')
})

test('moves one cell in each direction', async () => {
  const base = run(createGame(12, 10, zero))
  expect(step(base, zero).snake[0]).toEqual({ x: 7, y: 5 }) // right
  expect(step(turn(base, 'up'), zero).snake[0]).toEqual({ x: 6, y: 4 })
  expect(step(turn(base, 'down'), zero).snake[0]).toEqual({ x: 6, y: 6 })
  // left is a reversal of the starting 'right' heading -> ignored, keeps going right
  expect(step(turn(base, 'left'), zero).snake[0]).toEqual({ x: 7, y: 5 })
})

test('180-degree reversal is ignored; perpendicular turns queue, last wins', async () => {
  const g = run(createGame(12, 10, zero)) // committed heading 'right'
  expect(turn(g, 'left').queued).toBe(null) // opposite of committed -> ignored
  expect(turn(g, 'up').queued).toBe('up') // perpendicular -> queued
  expect(turn(turn(g, 'up'), 'down').queued).toBe('down') // both perpendicular to 'right', last wins
})

test('cannot reverse into the committed heading after a turn lands', async () => {
  const moving = step(turn(run(createGame(12, 10, zero)), 'up'), zero) // now committed 'up'
  expect(moving.dir).toBe('up')
  expect(turn(moving, 'down').queued).toBe(null) // 'down' reverses committed 'up' -> blocked
})

test('queued direction is applied on the next step then cleared', async () => {
  const g = turn(run(createGame(12, 10, zero)), 'up')
  expect(g.queued).toBe('up')
  const after = step(g, zero)
  expect(after.dir).toBe('up')
  expect(after.queued).toBe(null)
})

test('eating food grows the snake and adds 10', async () => {
  const g = run(createGame(12, 10, zero))
  const withFood: SnakeState = { ...g, food: { x: 7, y: 5 } } // directly ahead
  const after = step(withFood, zero)
  expect(after.score).toBe(10)
  expect(after.snake.length).toBe(4)
  expect(after.snake[0]).toEqual({ x: 7, y: 5 })
})

test('a normal step does not grow', async () => {
  const after = step(run(createGame(12, 10, zero)), zero)
  expect(after.snake.length).toBe(3)
})

test('food never spawns inside the snake', async () => {
  const snake: Point[] = [
    { x: 1, y: 0 },
    { x: 0, y: 0 },
  ]
  for (let r = 0; r < 20; r++) {
    const food = placeFood(3, 1, snake, () => r / 20)
    expect(snake.some(p => p.x === food.x && p.y === food.y)).toBe(false)
  }
})

test('freeCells excludes occupied cells', async () => {
  expect(freeCells(2, 2, [{ x: 0, y: 0 }]).length).toBe(3)
})

test('wall collision ends the game', async () => {
  const g: SnakeState = {
    width: 5,
    height: 5,
    snake: [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }],
    dir: 'right',
    queued: null,
    food: { x: 0, y: 0 },
    score: 0,
    status: 'running',
  }
  expect(step(g, zero).status).toBe('game_over')
})

test('self collision ends the game', async () => {
  // Spiral; head at (2,0) turning down walks into its own body cell (2,1).
  const g: SnakeState = {
    width: 5,
    height: 5,
    snake: [
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    dir: 'right',
    queued: 'down',
    food: { x: 4, y: 4 },
    score: 0,
    status: 'running',
  }
  expect(step(g, zero).status).toBe('game_over')
})

test('moving into the vacating tail cell is allowed', async () => {
  // 2x2 coil: head (0,0), tail (0,1). Turning down moves into the tail, which
  // moves away this tick, so it must NOT collide.
  const g: SnakeState = {
    width: 4,
    height: 4,
    snake: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    dir: 'left',
    queued: 'down',
    food: { x: 3, y: 3 },
    score: 0,
    status: 'running',
  }
  const after = step(g, zero)
  expect(after.status).toBe('running')
  expect(after.snake[0]).toEqual({ x: 0, y: 1 })
})

test('pause freezes and toggles back, state preserved', async () => {
  const g = run(createGame(12, 10, zero))
  const moved = step(g, zero)
  const paused = togglePause(moved)
  expect(paused.status).toBe('paused')
  expect(step(paused, zero)).toBe(paused) // a step while paused is a no-op (same object)
  const resumed = togglePause(paused)
  expect(resumed.status).toBe('running')
  expect(resumed.snake).toEqual(moved.snake) // nothing lost across pause/resume
})

test('start moves ready/paused to running only', async () => {
  expect(start(createGame(12, 10, zero)).status).toBe('running')
  expect(start({ ...createGame(12, 10, zero), status: 'game_over' }).status).toBe('game_over')
})

test('speed increases with score down to a floor', async () => {
  expect(intervalFor(0)).toBe(START_INTERVAL_MS)
  expect(intervalFor(10)).toBeLessThan(START_INTERVAL_MS)
  expect(intervalFor(10000)).toBe(MIN_INTERVAL_MS)
})
