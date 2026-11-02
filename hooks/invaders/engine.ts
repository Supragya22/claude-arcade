// Space Invaders — pure rules engine. Deterministic given an injected Rng; no
// timers, input or storage. One `step` advances the simulation by one tick.

import {
  BUNKER_COUNT,
  BUNKER_FROM_BOTTOM,
  BUNKER_SHAPE,
  BUNKER_W,
  BURST_TTL,
  enemyStepInterval,
  enemyTypeForRow,
  ENEMY_FIRE_CHANCE,
  ENEMY_W,
  FIRE_COOLDOWN_STEPS,
  FORMATION_GAP_X,
  FORMATION_TOP,
  MAX_E_BULLETS,
  MAX_P_BULLETS,
  POINTS,
  ROWS,
  COLS,
  SHIP_W,
  START_LIVES,
  UFO_POINTS,
  UFO_ROW,
  UFO_ROWS,
  UFO_SPAWN_MAX_STEPS,
  UFO_SPAWN_MIN_STEPS,
  WAVE_HOLD_STEPS,
} from './constants.ts'
import type { Burst, Enemy, InvadersState, Point, Rng, Status, Ufo } from './types.ts'

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))
const key = (width: number, x: number, y: number): number => y * width + x

const COL_STRIDE = ENEMY_W + FORMATION_GAP_X

function spawnFormation(width: number): readonly Enemy[] {
  const cols = Math.min(COLS, Math.max(1, Math.floor((width + FORMATION_GAP_X) / COL_STRIDE)))
  const blockW = cols * ENEMY_W + (cols - 1) * FORMATION_GAP_X
  const startX = Math.max(0, Math.floor((width - blockW) / 2))
  const enemies: Enemy[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({ x: startX + c * COL_STRIDE, y: FORMATION_TOP + r, type: enemyTypeForRow(r) })
    }
  }
  return enemies
}

// Evenly spaced arch-shaped shields, a few rows above the ship (BUNKER_SHAPE).
// Each cell takes one hit before it erodes.
function spawnBunkers(width: number, height: number): readonly Point[] {
  const topY = height - 1 - BUNKER_FROM_BOTTOM
  if (topY <= FORMATION_TOP + ROWS) return [] // no room between formation and ship
  const span = BUNKER_COUNT * BUNKER_W
  const gap = Math.max(1, Math.floor((width - span) / (BUNKER_COUNT + 1)))
  const cells: Point[] = []
  for (let b = 0; b < BUNKER_COUNT; b++) {
    const x0 = gap + b * (BUNKER_W + gap)
    for (const o of BUNKER_SHAPE) {
      const x = x0 + o.x
      if (x < width) cells.push({ x, y: topY + o.y })
    }
  }
  return cells
}

// A random bonus value, chosen from the fixed tiers (deterministic given rng).
function ufoPoints(rng: Rng): number {
  return UFO_POINTS[Math.floor(rng() * UFO_POINTS.length)] ?? UFO_POINTS[0]
}

function ufoRespawnDelay(rng: Rng): number {
  return UFO_SPAWN_MIN_STEPS + Math.floor(rng() * (UFO_SPAWN_MAX_STEPS - UFO_SPAWN_MIN_STEPS + 1))
}

export function createGame(width: number, height: number): InvadersState {
  const enemies = spawnFormation(width)
  return {
    width,
    height,
    player: clamp(Math.floor(width / 2), 0, width - SHIP_W),
    lives: START_LIVES,
    enemies,
    waveTotal: enemies.length,
    dir: 1,
    enemyCooldown: enemyStepInterval(enemies.length, enemies.length, 1),
    fireCooldown: 0,
    pBullets: [],
    eBullets: [],
    ufo: null,
    ufoCooldown: UFO_SPAWN_MIN_STEPS,
    bunkers: spawnBunkers(width, height),
    bursts: [],
    marchFrame: 0,
    score: 0,
    wave: 1,
    holdSteps: 0,
    status: 'ready',
  }
}

export function nextWave(s: InvadersState): InvadersState {
  const wave = s.wave + 1
  const enemies = spawnFormation(s.width)
  return {
    ...s,
    enemies,
    waveTotal: enemies.length,
    dir: 1,
    enemyCooldown: enemyStepInterval(enemies.length, enemies.length, wave),
    fireCooldown: 0,
    pBullets: [],
    eBullets: [],
    ufo: null,
    ufoCooldown: UFO_SPAWN_MIN_STEPS,
    bunkers: spawnBunkers(s.width, s.height), // shields rebuilt each wave
    bursts: [],
    wave,
    holdSteps: 0,
    status: 'running',
  }
}

export function start(s: InvadersState): InvadersState {
  return s.status === 'ready' || s.status === 'paused' ? { ...s, status: 'running' } : s
}

export function togglePause(s: InvadersState): InvadersState {
  if (s.status === 'running') return { ...s, status: 'paused' }
  if (s.status === 'paused') return { ...s, status: 'running' }
  return s
}

export function movePlayer(s: InvadersState, dx: number): InvadersState {
  if (s.status !== 'running') return s
  const player = clamp(s.player + dx, 0, s.width - SHIP_W) // keep the 2-cell ship on the board
  return player === s.player ? s : { ...s, player }
}

export function fire(s: InvadersState): InvadersState {
  if (s.status !== 'running') return s
  if (s.fireCooldown > 0 || s.pBullets.length >= MAX_P_BULLETS) return s
  return {
    ...s,
    pBullets: [...s.pBullets, { x: s.player, y: s.height - 2 }],
    fireCooldown: FIRE_COOLDOWN_STEPS,
  }
}

export function step(s: InvadersState, rng: Rng): InvadersState {
  // Between waves: hold the banner briefly, then spawn the next wave.
  if (s.status === 'wave_cleared') {
    return s.holdSteps <= 1 ? nextWave(s) : { ...s, holdSteps: s.holdSteps - 1 }
  }
  if (s.status !== 'running') return s

  const w = s.width
  const playerRow = s.height - 1
  let score = s.score
  let lives = s.lives

  // 0. age the kill flashes: rise one cell, drop those past their lifetime.
  let bursts: readonly Burst[] = s.bursts
    .map(b => ({ x: b.x, y: b.y - 1, points: b.points, t: b.t - 1, kind: b.kind }))
    .filter(b => b.t > 0)

  // 1. advance bullets; drop those off the board.
  let pBullets: readonly Point[] = s.pBullets.map(b => ({ x: b.x, y: b.y - 1 })).filter(b => b.y >= 0)
  let eBullets: readonly Point[] = s.eBullets.map(b => ({ x: b.x, y: b.y + 1 })).filter(b => b.y < s.height)

  const fireCooldown = Math.max(0, s.fireCooldown - 1)

  // 2. bunkers absorb any shot that enters a cell — the shot and the cell both go.
  let bunkers = s.bunkers
  if (bunkers.length > 0) {
    const bset = new Set(bunkers.map(c => key(w, c.x, c.y)))
    const struck = new Set<number>()
    const absorb = (b: Point): boolean => {
      const k = key(w, b.x, b.y)
      if (bset.has(k)) {
        struck.add(k)
        return false
      }
      return true
    }
    pBullets = pBullets.filter(absorb)
    eBullets = eBullets.filter(absorb)
    if (struck.size > 0) bunkers = bunkers.filter(c => !struck.has(key(w, c.x, c.y)))
  }

  // 3. formation: step the block sideways, or reverse + descend at a wall.
  let enemies = s.enemies
  let dir = s.dir
  let marchFrame = s.marchFrame
  let enemyCooldown = s.enemyCooldown - 1
  if (enemies.length > 0 && enemyCooldown <= 0) {
    const xs = enemies.map(e => e.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    // enemies are ENEMY_W cells wide, so the block's right edge is maxX + ENEMY_W - 1.
    const atEdge = (dir === 1 && maxX + ENEMY_W - 1 >= w - 1) || (dir === -1 && minX <= 0)
    if (atEdge) {
      dir = dir === 1 ? -1 : 1
      enemies = enemies.map(e => ({ ...e, y: e.y + 1 }))
    } else {
      enemies = enemies.map(e => ({ ...e, x: e.x + dir }))
    }
    marchFrame = s.marchFrame + 1 // flip the waddle on every move
    enemyCooldown = enemyStepInterval(enemies.length, s.waveTotal, s.wave)
    // enemies passing through a shield grind it away.
    if (bunkers.length > 0) {
      const eset = new Set(enemies.map(e => key(w, e.x, e.y)))
      bunkers = bunkers.filter(c => !eset.has(key(w, c.x, c.y)))
    }
  }

  // invasion: the formation reached the player's row → game over.
  if (enemies.some(e => e.y >= playerRow)) {
    return { ...s, enemies, dir, marchFrame, enemyCooldown, pBullets, eBullets, fireCooldown, bunkers, bursts, status: 'game_over' }
  }

  // 4. mystery ship: count down and appear, or drift across and leave.
  let ufo: Ufo | null = s.ufo
  let ufoCooldown = s.ufoCooldown
  if (ufo === null) {
    ufoCooldown -= 1
    if (ufoCooldown <= 0) {
      const fromLeft = rng() < 0.5
      ufo = { x: fromLeft ? 0 : w - 1, dir: fromLeft ? 1 : -1, points: ufoPoints(rng) }
    }
  } else {
    const nx = ufo.x + ufo.dir
    if (nx < 0 || nx >= w) {
      ufo = null
      ufoCooldown = ufoRespawnDelay(rng)
    } else {
      ufo = { ...ufo, x: nx }
    }
  }

  // 5. an enemy periodically fires, under the bullet cap.
  if (enemies.length > 0 && eBullets.length < MAX_E_BULLETS && rng() < ENEMY_FIRE_CHANCE) {
    const shooter = enemies[Math.floor(rng() * enemies.length)]
    if (shooter) eBullets = [...eBullets, { x: shooter.x, y: shooter.y + 1 }]
  }

  // 6. player shots vs enemies and the mystery ship — each shot counts once.
  const deadEnemy = new Set<number>()
  const usedShot = new Set<number>()
  const newBursts: Burst[] = []
  pBullets.forEach((b, bi) => {
    const ei = enemies.findIndex(
      (e, idx) => !deadEnemy.has(idx) && e.y === b.y && b.x >= e.x && b.x < e.x + ENEMY_W,
    )
    if (ei >= 0) {
      deadEnemy.add(ei)
      usedShot.add(bi)
      const e = enemies[ei]
      if (e) {
        score += POINTS[e.type]
        newBursts.push({ x: Math.min(e.x, w - 2), y: e.y, points: POINTS[e.type], t: BURST_TTL, kind: 'enemy' })
      }
    }
  })
  const u = ufo
  if (u) {
    const bi = pBullets.findIndex(
      (b, idx) => !usedShot.has(idx) && b.x === u.x && b.y >= UFO_ROW && b.y < UFO_ROW + UFO_ROWS,
    )
    if (bi >= 0) {
      usedShot.add(bi)
      score += u.points
      newBursts.push({ x: Math.min(u.x, w - 2), y: UFO_ROW, points: u.points, t: BURST_TTL, kind: 'enemy' })
      ufo = null
      ufoCooldown = ufoRespawnDelay(rng)
    }
  }
  if (deadEnemy.size > 0) enemies = enemies.filter((_, idx) => !deadEnemy.has(idx))
  if (usedShot.size > 0) pBullets = pBullets.filter((_, bi) => !usedShot.has(bi))
  if (newBursts.length > 0) bursts = [...bursts, ...newBursts]

  // 7. enemy shots vs player (ship is SHIP_W cells wide) — lose one life per hit.
  const hitsPlayer = (b: Point): boolean => b.y === playerRow && b.x >= s.player && b.x < s.player + SHIP_W
  if (eBullets.some(hitsPlayer)) {
    eBullets = eBullets.filter(b => !hitsPlayer(b))
    lives -= 1
    bursts = [...bursts, { x: Math.min(s.player, w - 2), y: playerRow, points: 0, t: BURST_TTL, kind: 'player' }]
    if (lives <= 0) {
      return { ...s, enemies, dir, marchFrame, enemyCooldown, pBullets, eBullets, fireCooldown, ufo, ufoCooldown, bunkers, bursts, score, lives: 0, status: 'game_over' }
    }
  }

  // 8. wave cleared → brief banner, then nextWave on a later step.
  if (enemies.length === 0) {
    const status: Status = 'wave_cleared'
    return { ...s, enemies, dir, marchFrame, enemyCooldown, pBullets: [], eBullets, fireCooldown, ufo, ufoCooldown, bunkers, bursts, score, lives, holdSteps: WAVE_HOLD_STEPS, status }
  }

  return { ...s, enemies, dir, marchFrame, enemyCooldown, pBullets, eBullets, fireCooldown, ufo, ufoCooldown, bunkers, bursts, score, lives, status: 'running' }
}
