export type Dir = 'up' | 'down' | 'left' | 'right'
export type Status = 'ready' | 'running' | 'paused' | 'game_over'
export type Point = { readonly x: number; readonly y: number }

// Injected so the engine stays pure and tests are deterministic.
export type Rng = () => number

export type SnakeState = {
  readonly width: number
  readonly height: number
  readonly snake: readonly Point[] // head first
  readonly dir: Dir // last committed heading
  readonly queued: Dir | null // next heading, applied on the coming step
  readonly food: Point
  readonly score: number
  readonly status: Status
}
