import { expect, test } from 'claude-code/testing'

import type { Cell, Game } from '../types'
import { applyPlayerMove, emptyCells, newGame, outcome, winnerOf } from './engine.ts'

const b = (s: string): Cell[] =>
  [...s].map(ch => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : null))

test('winnerOf finds every one of the 8 lines', async () => {
  const lines = [
    'XXX......', '...XXX...', '......XXX',
    'X..X..X..', '.X..X..X.', '..X..X..X',
    'X...X...X', '..X.X.X..',
  ]
  for (const s of lines) expect(winnerOf(b(s))?.winner).toBe('X')
})

test('no false win on empty or scattered boards', async () => {
  expect(winnerOf(b('.........'))).toBe(null)
  expect(winnerOf(b('XOXXOOOXX'))).toBe(null) // full, no line
})

test('outcome detects a draw on a full, line-free board', async () => {
  expect(outcome(b('XOXXOOOXX')).status).toBe('draw')
})

test('a move after game-over is a no-op (same object)', async () => {
  const won: Game = {
    board: b('XXX......'), status: 'win', winner: 'X', line: [0, 1, 2], recorded: false,
  }
  expect(applyPlayerMove(won, 4)).toBe(won)
})

test('an occupied cell cannot be played (same object)', async () => {
  const g = newGame()
  g.board[0] = 'X'
  expect(applyPlayerMove(g, 0)).toBe(g)
})

test('playing an empty cell places X and hands the turn to the AI', async () => {
  const g = applyPlayerMove(newGame(), 0)
  expect(g.board[0]).toBe('X')
  expect(g.status).toBe('ai') // engine no longer auto-moves O; AI is a separate step
})

test('a winning X move ends the game immediately (no AI turn)', async () => {
  const g: Game = {
    board: b('XX.OO....'), status: 'play', winner: null, line: null, recorded: false,
  }
  const after = applyPlayerMove(g, 2)
  expect(after.status).toBe('win')
  expect(after.winner).toBe('X')
})

test('emptyCells lists exactly the free indices', async () => {
  expect(emptyCells(b('X.O.X.O.X'))).toEqual([1, 3, 5, 7])
})
