import { expect, test } from 'claude-code/testing'

import type { Cell, Game, Player } from '../types'
import { applyAiMove, bestMove } from './ai.ts'
import { emptyCells, other, place, winnerOf } from './engine.ts'

const b = (s: string): Cell[] =>
  [...s].map(ch => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : null))

test('takes an immediate win over anything else', async () => {
  // O can complete 0,1,2; X separately threatens 5. O must still take its win.
  expect(bestMove(b('OO.XX....'), 'O')).toBe(2)
})

test('blocks an immediate player win', async () => {
  // X threatens 2; O has no win of its own → it must block 2.
  expect(bestMove(b('XX.O.....'), 'O')).toBe(2)
})

test('only ever returns a legal, empty cell', async () => {
  const boards = ['.........', 'X........', 'XOXO.XOX.', 'XOXOXOXO.', 'XX.O.....']
  for (const s of boards) {
    const board = b(s)
    const open = emptyCells(board)
    if (open.length === 0) continue
    expect(open.includes(bestMove(board, 'O'))).toBe(true)
  }
})

// Exhaustive: the human (X) tries EVERY legal move sequence; O answers with the
// optimal move. The game tree is small enough to search in full.
function hardNeverLoses(board: Cell[], toMove: Player): boolean {
  const w = winnerOf(board)
  if (w) return w.winner !== 'X' // X winning = the AI lost
  const open = emptyCells(board)
  if (open.length === 0) return true // draw
  if (toMove === 'X') {
    for (const i of open) {
      if (!hardNeverLoses(place(board, i, 'X'), 'O')) return false
    }
    return true
  }
  // O plays its single deterministic optimal move
  return hardNeverLoses(place(board, bestMove(board, 'O'), 'O'), 'X')
}

test('never loses against any legal player strategy (full tree)', async () => {
  expect(hardNeverLoses(b('.........'), 'X')).toBe(true)
  // Even when the human opens the center (the strongest start).
  expect(hardNeverLoses(place(b('.........'), 4, 'X'), 'O')).toBe(true)
})

test('optimal vs optimal is always a draw (unbeatable ≠ always wins)', async () => {
  let board = b('.........')
  let turn: Player = 'X'
  let result: 'X' | 'O' | 'draw' = 'draw'
  for (;;) {
    const w = winnerOf(board)
    if (w) {
      result = w.winner
      break
    }
    if (emptyCells(board).length === 0) break
    board = place(board, bestMove(board, turn), turn)
    turn = other(turn)
  }
  expect(result).toBe('draw')
})

test('applyAiMove always adds exactly one legal O (even when it blunders)', async () => {
  for (let t = 0; t < 300; t++) {
    const g: Game = {
      board: b('X...O....'), status: 'ai', winner: null, line: null, recorded: false,
    }
    const before = g.board.filter(c => c === 'O').length
    const after = applyAiMove(g)
    expect(after.board.filter(c => c === 'O').length).toBe(before + 1)
    // every pre-existing mark is untouched
    for (let i = 0; i < 9; i++) {
      if (g.board[i] !== null) expect(after.board[i]).toBe(g.board[i])
    }
  }
})

test('applyAiMove leaves a non-AI game untouched', async () => {
  const g: Game = {
    board: b('X........'), status: 'play', winner: null, line: null, recorded: false,
  }
  expect(applyAiMove(g)).toBe(g)
})

test('tie-breaking is deterministic (reproducible first move)', async () => {
  // Center is the preferred opening; the same board always yields the same move.
  expect(bestMove(b('.........'), 'O')).toBe(bestMove(b('.........'), 'O'))
  expect(bestMove(b('.........'), 'O')).toBe(4)
})
