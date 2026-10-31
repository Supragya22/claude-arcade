export type Player = 'X' | 'O'
export type Cell = Player | null
export type Status = 'play' | 'ai' | 'win' | 'draw'

export type Game = {
  board: Cell[] // length 9, row-major
  status: Status
  winner: Cell
  line: number[] | null // winning triple, for highlight
  recorded: boolean // whether a terminal result was counted into scores
}

export type Scores = { x: number; o: number; draws: number }

declare module 'claude-code' {
  interface PluginState {
    arcade: {
      game: Shaped<Game>
      scores: Shaped<Scores>
      theme: string
      frame: number // animation tick driving the mascot + winning-line pulse
      flash: number // cell index briefly flashed on placement, or -1
      wipe: number // new-game sweep progress (0..9), or -1 when idle
      motion: boolean // animations on (false = reduced motion)
      sound: boolean // sound effects on
      themeAuto: boolean // pick the theme from the festival calendar
      minimized: boolean // pane collapsed to a compact bar
    }
  }
}
