import { expect, test } from 'claude-code/testing'

import {
  BURST_TTL,
  MAX_P_BULLETS,
  POINTS,
  SHIP_W,
  START_LIVES,
  UFO_POINTS,
  UFO_ROW,
  WAVE_HOLD_STEPS,
} from './constants.ts'
import { createGame, fire, movePlayer, start, step, togglePause } from './engine.ts'
import type { Enemy, InvadersState } from './types.ts'

const W = 26 // wide enough for the 7×2-cell formation to have room to march
const H = 16
const noFire = () => 1 // rng() < ENEMY_FIRE_CHANCE is always false → no enemy shots

function firstEnemy(g: InvadersState): Enemy {
  const e = g.enemies[0]
  if (!e) throw new Error('expected at least one enemy')
  return e
}
const maxX = (g: InvadersState): number => Math.max(...g.enemies.map(e => e.x))

test('new game: 3 lives, wave 1, ready, a full formation', async () => {
  const g = createGame(W, H)
  expect(g.lives).toBe(START_LIVES)
  expect(g.wave).toBe(1)
  expect(g.status).toBe('ready')
  expect(g.enemies.length > 0).toBe(true)
  expect(g.enemies.length).toBe(g.waveTotal)
})

test('player moves and is clamped to the board', async () => {
  const g = start(createGame(W, H))
  expect(movePlayer(g, 1).player).toBe(g.player + 1)
  expect(movePlayer(g, -1).player).toBe(g.player - 1)
  expect(movePlayer({ ...g, player: 0 }, -1).player).toBe(0)
  // the 2-cell ship clamps so its right edge stays on the board
  expect(movePlayer({ ...g, player: W - SHIP_W }, 1).player).toBe(W - SHIP_W)
})

test('player cannot move unless running', async () => {
  const ready = createGame(W, H)
  expect(movePlayer(ready, 1)).toBe(ready)
})

test('firing adds a shot; with no cooldown a second press fires again', async () => {
  const g = start(createGame(W, H))
  const f1 = fire(g)
  expect(f1.pBullets.length).toBe(1)
  expect(fire(f1).pBullets.length).toBe(2) // no cooldown — every press fires, up to the cap
})

test('multiple simultaneous player shots, capped', async () => {
  let s = start(createGame(W, H))
  for (let i = 0; i < MAX_P_BULLETS + 2; i++) s = fire({ ...s, fireCooldown: 0 })
  expect(s.pBullets.length).toBe(MAX_P_BULLETS)
})

test('bullets travel and leave the board', async () => {
  const base = start(createGame(W, H))
  // row 8 is clear of the formation (rows 2..5) and the shields (rows 11..12).
  const g = { ...base, pBullets: [{ x: 8, y: 8 }], eBullets: [{ x: 9, y: 8 }], enemyCooldown: 99 }
  const r = step(g, noFire)
  expect(r.pBullets[0]).toEqual({ x: 8, y: 7 }) // up
  expect(r.eBullets[0]).toEqual({ x: 9, y: 9 }) // down

  const edge = { ...base, pBullets: [{ x: 5, y: 0 }], eBullets: [{ x: 6, y: H - 1 }], enemyCooldown: 99 }
  const r2 = step(edge, noFire)
  expect(r2.pBullets.length).toBe(0)
  expect(r2.eBullets.length).toBe(0)
})

test('formation steps sideways, then reverses and descends at the wall', async () => {
  const g = start(createGame(W, H))
  const moved = step({ ...g, enemyCooldown: 1 }, noFire)
  expect(moved.enemies.length).toBe(g.enemies.length)
  expect(firstEnemy(moved).x).toBe(firstEnemy(g).x + 1) // right, not at edge

  const delta = W - 1 - maxX(g)
  const atWall = { ...g, enemies: g.enemies.map(e => ({ ...e, x: e.x + delta })), dir: 1 as const, enemyCooldown: 1 }
  const r = step(atWall, noFire)
  expect(r.dir).toBe(-1)
  expect(firstEnemy(r).y).toBe(firstEnemy(atWall).y + 1) // descended
  expect(firstEnemy(r).x).toBe(firstEnemy(atWall).x) // x held on the descent step
})

test('player shot destroys an aligned enemy and scores its type', async () => {
  const g = start(createGame(W, H))
  const e0 = firstEnemy(g) // top row → highest value
  const shot = { ...g, pBullets: [{ x: e0.x, y: e0.y + 1 }], enemyCooldown: 99 }
  const r = step(shot, noFire)
  expect(r.enemies.length).toBe(g.enemies.length - 1)
  expect(r.score).toBe(POINTS[e0.type])
  expect(r.pBullets.length).toBe(0) // shot consumed
})

test('each shot and each enemy is counted once', async () => {
  const g = start(createGame(W, H))
  const e0 = firstEnemy(g)
  // two shots onto the same cell: one kill, the other survives unused
  const shot = { ...g, pBullets: [{ x: e0.x, y: e0.y + 1 }, { x: e0.x, y: e0.y + 1 }], enemyCooldown: 99 }
  const r = step(shot, noFire)
  expect(r.enemies.length).toBe(g.enemies.length - 1)
  expect(r.score).toBe(POINTS[e0.type])
  expect(r.pBullets.length).toBe(1)
})

test('enemy shot hits the player and costs a life', async () => {
  const g = start(createGame(W, H))
  const atk = { ...g, eBullets: [{ x: g.player, y: H - 2 }], enemyCooldown: 99 }
  const r = step(atk, noFire)
  expect(r.lives).toBe(START_LIVES - 1)
  expect(r.eBullets.length).toBe(0)
})

test('losing the last life ends the game', async () => {
  const g = { ...start(createGame(W, H)), lives: 1, eBullets: [{ x: 10, y: H - 2 }], player: 10, enemyCooldown: 99 }
  const r = step(g, noFire)
  expect(r.status).toBe('game_over')
  expect(r.lives).toBe(0)
})

test('an enemy reaching the player row ends the game', async () => {
  const base = start(createGame(W, H))
  const g = { ...base, enemies: [{ x: W - 1, y: H - 2, type: 0 as const }], waveTotal: 1, dir: 1 as const, enemyCooldown: 1 }
  const r = step(g, noFire)
  expect(r.status).toBe('game_over')
})

test('clearing a wave advances to the next after a short hold', async () => {
  const base = start(createGame(W, H))
  const g = { ...base, enemies: [{ x: 5, y: 5, type: 0 as const }], waveTotal: 1, pBullets: [{ x: 5, y: 6 }], enemyCooldown: 99 }
  const cleared = step(g, noFire)
  expect(cleared.status).toBe('wave_cleared')
  expect(cleared.enemies.length).toBe(0)
  expect(cleared.holdSteps).toBe(WAVE_HOLD_STEPS)

  let s = cleared
  for (let i = 0; i < WAVE_HOLD_STEPS; i++) s = step(s, noFire)
  expect(s.status).toBe('running')
  expect(s.wave).toBe(2)
  expect(s.enemies.length > 0).toBe(true)
})

test('pause freezes the simulation and preserves state; resume restores it', async () => {
  const g = { ...start(createGame(W, H)), pBullets: [{ x: 5, y: 5 }] }
  const paused = togglePause(g)
  expect(paused.status).toBe('paused')
  expect(step(paused, noFire)).toBe(paused) // no-op, exact state frozen
  const resumed = togglePause(paused)
  expect(resumed.status).toBe('running')
  expect(resumed.pBullets).toEqual(g.pBullets)
})

test('start only runs from ready/paused; restart resets everything', async () => {
  expect(start(createGame(W, H)).status).toBe('running')
  expect(start(togglePause(start(createGame(W, H)))).status).toBe('running')
  const over = { ...createGame(W, H), status: 'game_over' as const }
  expect(start(over)).toBe(over)

  const fresh = createGame(W, H)
  expect(fresh.score).toBe(0)
  expect(fresh.lives).toBe(START_LIVES)
  expect(fresh.wave).toBe(1)
  expect(fresh.pBullets.length).toBe(0)
  expect(fresh.eBullets.length).toBe(0)
})

test('enemies periodically fire under a forcing rng', async () => {
  const g = { ...start(createGame(W, H)), enemyCooldown: 99 }
  const r = step(g, () => 0) // 0 < fire chance → the first enemy shoots
  expect(r.eBullets.length).toBe(1)
})

test('a mystery ship appears when its cooldown elapses', async () => {
  const g = { ...start(createGame(W, H)), ufoCooldown: 1, enemyCooldown: 99 }
  const r = step(g, () => 0) // rng 0 → spawns from the left, lowest bonus tier
  expect(r.ufo === null).toBe(false)
  expect(r.ufo ? r.ufo.x : -1).toBe(0)
  expect(r.ufo ? r.ufo.points : -1).toBe(UFO_POINTS[0])
})

test('the mystery ship drifts across, then leaves the board', async () => {
  const mid = { ...start(createGame(W, H)), ufo: { x: 5, dir: 1 as const, points: 100 }, enemyCooldown: 99 }
  expect(step(mid, noFire).ufo?.x).toBe(6) // moved one cell along its direction

  const edge = { ...start(createGame(W, H)), ufo: { x: W - 1, dir: 1 as const, points: 100 }, enemyCooldown: 99 }
  expect(step(edge, noFire).ufo).toBe(null) // ran off the edge
})

test('a player shot destroys the mystery ship for its bonus', async () => {
  const base = start(createGame(W, H))
  // ufo moves 5→6; a shot at (6, UFO_ROW+1) rises onto it.
  const g = { ...base, ufo: { x: 5, dir: 1 as const, points: 150 }, pBullets: [{ x: 6, y: UFO_ROW + 1 }], enemyCooldown: 99 }
  const r = step(g, noFire)
  expect(r.ufo).toBe(null)
  expect(r.score).toBe(base.score + 150)
  expect(r.pBullets.length).toBe(0)
})

test('a shield cell absorbs a player shot and is destroyed', async () => {
  const g = start(createGame(W, H))
  const cell = g.bunkers[0]
  if (!cell) throw new Error('expected bunkers')
  const shot = { ...g, pBullets: [{ x: cell.x, y: cell.y + 1 }], enemyCooldown: 99 }
  const r = step(shot, noFire)
  expect(r.bunkers.length).toBe(g.bunkers.length - 1)
  expect(r.pBullets.length).toBe(0)
})

test('a shield cell absorbs an enemy shot too', async () => {
  const g = start(createGame(W, H))
  const cell = g.bunkers[0]
  if (!cell) throw new Error('expected bunkers')
  const atk = { ...g, eBullets: [{ x: cell.x, y: cell.y - 1 }], enemyCooldown: 99 }
  const r = step(atk, noFire)
  expect(r.bunkers.length).toBe(g.bunkers.length - 1)
  expect(r.eBullets.length).toBe(0)
})

test('destroying an enemy spawns a score burst that ages out', async () => {
  const g = start(createGame(W, H))
  const e0 = firstEnemy(g)
  const shot = { ...g, pBullets: [{ x: e0.x, y: e0.y + 1 }], enemyCooldown: 99 }
  const r = step(shot, noFire)
  expect(r.bursts.length).toBe(1)
  expect(r.bursts[0] ? r.bursts[0].points : -1).toBe(POINTS[e0.type])
  expect(r.bursts[0] ? r.bursts[0].t : -1).toBe(BURST_TTL)

  let s: InvadersState = r
  for (let i = 0; i < BURST_TTL; i++) s = step(s, noFire)
  expect(s.bursts.length).toBe(0) // faded after its lifetime
})
