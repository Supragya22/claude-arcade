// Space Invaders — pure types. No Mods UI, timer or storage types here.

export type Status = 'ready' | 'running' | 'paused' | 'wave_cleared' | 'game_over'
export type Rng = () => number

// Enemy rows are worth different points: 0 = front/cheap .. 2 = back/valuable.
export type EnemyType = 0 | 1 | 2

export type Point = { readonly x: number; readonly y: number }
export type Enemy = { readonly x: number; readonly y: number; readonly type: EnemyType }

// Mystery ship: drifts across the top row for a bonus.
export type Ufo = { readonly x: number; readonly dir: 1 | -1; readonly points: number }
// A transient effect that ages out over `t` steps: an invader kill ('enemy' —
// explosion then +points) or the ship being hit ('player' — red explosion).
export type Burst = {
  readonly x: number
  readonly y: number
  readonly points: number
  readonly t: number
  readonly kind: 'enemy' | 'player'
}

export type InvadersState = {
  readonly width: number // board cells across
  readonly height: number // board cells down (player sits on the last row)
  readonly player: number // ship x (one cell wide)
  readonly lives: number
  readonly enemies: readonly Enemy[]
  readonly waveTotal: number // enemy count at wave start, for speed scaling
  readonly dir: 1 | -1 // formation horizontal direction
  readonly enemyCooldown: number // sim-steps until the formation next moves
  readonly fireCooldown: number // sim-steps until the player may fire again
  readonly pBullets: readonly Point[] // player shots, travel up
  readonly eBullets: readonly Point[] // enemy shots, travel down
  readonly ufo: Ufo | null // mystery ship, or null when absent
  readonly ufoCooldown: number // sim-steps until the next mystery ship appears
  readonly bunkers: readonly Point[] // intact shield cells; eroded by any shot
  readonly bursts: readonly Burst[] // transient kill flashes / score popups
  readonly marchFrame: number // flips each formation move, for the waddle animation
  readonly score: number
  readonly wave: number
  readonly holdSteps: number // pause between clearing a wave and the next
  readonly status: Status
}
