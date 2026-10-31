export const START_LEN = 3
export const FOOD_POINTS = 10

// Each game cell is drawn 2 terminal columns wide so cells read roughly square
// (a terminal cell is about twice as tall as wide).
export const CELL_COLS = 2

// Board sizing, in game cells. Clamped to what the pane region spares.
export const MIN_W = 12
export const MAX_W = 28
export const MIN_H = 9
export const MAX_H = 20

// One frame-clock timer runs at this interval; movement happens every
// `intervalFor(score)` ms via an accumulator, so speed never spawns a 2nd timer.
export const BASE_TICK_MS = 50
export const START_INTERVAL_MS = 220 // ~4.5 moves/sec at level 1
export const MIN_INTERVAL_MS = 70 // ~14 moves/sec ceiling
export const SPEEDUP_MS = 6 // faster per food eaten

export function intervalFor(score: number): number {
  const eaten = score / FOOD_POINTS
  return Math.max(MIN_INTERVAL_MS, START_INTERVAL_MS - eaten * SPEEDUP_MS)
}

export function levelFor(score: number): number {
  return 1 + Math.floor(score / 50)
}
