import type { EnemyType } from './types.ts'

// Each game cell is drawn 2 terminal columns wide so cells read roughly square.
export const CELL_COLS = 2

export const START_LIVES = 3

// Enemy formation at wave start.
export const ROWS = 4 // one EnemyType band per row-pair; see enemyTypeForRow
export const COLS = 7 // columns per row
export const ENEMY_W = 2 // each alien is this many cells wide
export const FORMATION_GAP_X = 1 // empty cell between columns, for a roomy block
export const FORMATION_TOP = 2 // rows above the formation (the UFO band is 2 tall)

export const SHIP_W = 2 // the player ship is this many cells wide

export const MAX_P_BULLETS = 5 // simultaneous player shots on screen (the only fire limit)
export const MAX_E_BULLETS = 6
export const FIRE_COOLDOWN_STEPS = 0 // no cooldown: every Space press fires if under the cap

export const POINTS: Record<EnemyType, number> = { 0: 10, 1: 20, 2: 30 }

// Board sizing, in game cells. Invaders-only (Snake/TTT have their own copies).
// Width matches Snake (driven by the pane's columns, capped at MAX_W); height
// gets a tall cap so the board fills a tall pane and the ship sits at the bottom.
export const MIN_W = 12
export const MAX_W = 28
export const MIN_H = 12
export const MAX_H = 64
// The docked pane sizes the Client to its content, so reading height back from
// the region collapses it. Drive height from this target instead, and the pane
// grows to fit — this is what fills the pane vertically.
export const FILL_H = 28

// One frame-clock timer runs at BASE_TICK_MS; the simulation advances one step
// every STEP_MS via an accumulator, so wave/restart never spawns a 2nd timer.
export const BASE_TICK_MS = 50
export const STEP_MS = 60 // bullets move one cell per step (~16 cells/sec)

// The formation moves every N steps: slower with many enemies, faster as they
// thin out and on later waves. Bounded so it never overlaps its own moves.
export const ENEMY_STEP_START = 12
export const ENEMY_STEP_MIN = 2
export const ENEMY_FIRE_CHANCE = 0.06 // per step, while under the bullet cap

export const WAVE_HOLD_STEPS = 16 // ~1s banner between waves

// Mystery ship (UFO): drifts across the top band (2 cells tall) for a bonus.
export const UFO_ROW = 0
export const UFO_ROWS = 2 // sprite height; a shot anywhere in the band hits it
export const UFO_SPAWN_MIN_STEPS = 120 // ~7s at STEP_MS between appearances
export const UFO_SPAWN_MAX_STEPS = 300 // ~18s
export const UFO_POINTS = [50, 100, 150] as const

// Destructible bunkers: a compact arch above the ship, each cell absorbing one
// shot. Kept small (invader-sized) and set high, so there's room below it.
export const BUNKER_COUNT = 3
export const BUNKER_W = 3 // cells across the top row
export const BUNKER_ROWS = 2
export const BUNKER_FROM_BOTTOM = 4 // low enough to survive the no-room guard at min height
// Small arch footprint (offsets from top-left): a top bar on two legs, leaving
// a gap underneath to shelter in.
export const BUNKER_SHAPE: readonly { x: number; y: number }[] = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  { x: 0, y: 1 }, { x: 2, y: 1 },
]

// Kill flash / floating score lifetime, in sim-steps.
export const BURST_TTL = 4

// Top rows are the valuable types; map a formation row to its EnemyType.
export function enemyTypeForRow(row: number): EnemyType {
  if (row === 0) return 2
  if (row === 1) return 1
  return 0
}

export function enemyStepInterval(remaining: number, total: number, wave: number): number {
  const start = Math.max(ENEMY_STEP_MIN + 1, ENEMY_STEP_START - (wave - 1) * 2)
  const frac = total > 0 ? remaining / total : 0
  return Math.max(ENEMY_STEP_MIN, Math.round(ENEMY_STEP_MIN + (start - ENEMY_STEP_MIN) * frac))
}

export function levelFor(score: number): number {
  return 1 + Math.floor(score / 500)
}
