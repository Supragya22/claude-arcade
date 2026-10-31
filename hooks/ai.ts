import type { Cell, Game, Player } from '../types'
import { emptyCells, other, outcome, place, winnerOf } from './engine.ts'

// Deterministic tie-break: center, then corners, then edges. Reproducible.
const PREFERENCE = [4, 0, 2, 6, 8, 1, 3, 5, 7]

function orderedOpen(board: Cell[]): number[] {
  const open = new Set(emptyCells(board))
  return PREFERENCE.filter(i => open.has(i))
}

// Minimax with alpha-beta. Depth-aware: a win is better the sooner it comes
// (10 - depth) and a loss less bad the later it comes (depth - 10), so the AI
// prefers faster wins and slower losses — and plays for the draw it cannot
// beat against perfect play. "Unbeatable" means never loses, not always wins.
function minimax(
  board: Cell[],
  me: Player,
  toMove: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const w = winnerOf(board)
  if (w) return w.winner === me ? 10 - depth : depth - 10
  const open = emptyCells(board)
  if (open.length === 0) return 0

  if (toMove === me) {
    let best = -Infinity
    for (const i of open) {
      best = Math.max(best, minimax(place(board, i, toMove), me, other(toMove), depth + 1, alpha, beta))
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break // prune
    }
    return best
  }

  let best = Infinity
  for (const i of open) {
    best = Math.min(best, minimax(place(board, i, toMove), me, other(toMove), depth + 1, alpha, beta))
    beta = Math.min(beta, best)
    if (alpha >= beta) break // prune
  }
  return best
}

// Optimal move for `me`, evaluated in deterministic preference order.
export function bestMove(board: Cell[], me: Player): number {
  let bestScore = -Infinity
  let best = -1
  for (const i of orderedOpen(board)) {
    const score = minimax(place(board, i, me), me, other(me), 1, -Infinity, Infinity)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

// How often the AI slips into a random legal move instead of the optimal one.
// Keeps it tough but humanly beatable now and then. No difficulty selector.
export const BLUNDER_RATE = 0.2

// The move the AI (O) actually plays: usually optimal, occasionally a slip.
export function aiPick(board: Cell[]): number {
  if (Math.random() < BLUNDER_RATE) {
    const open = emptyCells(board)
    if (open.length > 0) {
      return open[Math.floor(Math.random() * open.length)] ?? open[0] ?? -1
    }
  }
  return bestMove(board, 'O')
}

// The AI (O) answers. Requires status 'ai'.
export function applyAiMove(game: Game): Game {
  if (game.status !== 'ai') return game
  const i = aiPick(game.board)
  if (i < 0) return game
  const board = place(game.board, i, 'O')
  const o = outcome(board)
  return { ...game, board, status: o.status, winner: o.winner, line: o.line, recorded: false }
}
