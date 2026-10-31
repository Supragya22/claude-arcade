import type { Cell, Game, Player, Status } from '../types'

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6], // diagonals
]

export function newGame(): Game {
  return { board: Array(9).fill(null), status: 'play', winner: null, line: null, recorded: false }
}

export function other(p: Player): Player {
  return p === 'X' ? 'O' : 'X'
}

export function winnerOf(board: Cell[]): { winner: Player; line: number[] } | null {
  for (const [a, b, c] of LINES) {
    const v = board[a]
    if (v !== null && v !== undefined && v === board[b] && v === board[c]) {
      return { winner: v, line: [a, b, c] }
    }
  }
  return null
}

export function emptyCells(board: Cell[]): number[] {
  const out: number[] = []
  for (let i = 0; i < 9; i++) if (board[i] === null) out.push(i)
  return out
}

// Place `player` at `i` on a copy. Caller guarantees the cell is legal.
export function place(board: Cell[], i: number, player: Player): Cell[] {
  const next = board.slice()
  next[i] = player
  return next
}

export function outcome(board: Cell[]): {
  status: Status
  winner: Cell
  line: number[] | null
} {
  const w = winnerOf(board)
  if (w) return { status: 'win', winner: w.winner, line: w.line }
  if (emptyCells(board).length === 0) {
    return { status: 'draw', winner: null, line: null }
  }
  return { status: 'play', winner: null, line: null }
}

// The human (X) plays cell `i`. Illegal moves and moves after game-over return
// the same object. If the game continues, status becomes 'ai' (AI to move).
export function applyPlayerMove(game: Game, i: number): Game {
  if (game.status !== 'play' || i < 0 || i > 8 || game.board[i] !== null) {
    return game
  }
  const board = place(game.board, i, 'X')
  const o = outcome(board)
  return {
    ...game,
    board,
    status: o.status === 'play' ? 'ai' : o.status,
    winner: o.winner,
    line: o.line,
    recorded: false,
  }
}
