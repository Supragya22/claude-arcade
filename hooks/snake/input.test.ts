import { expect, test } from 'claude-code/testing'

import { actionFor } from './input.ts'

test('arrow keys map to directions', async () => {
  expect(actionFor({ key: 'up' })).toEqual({ kind: 'turn', dir: 'up' })
  expect(actionFor({ key: 'down' })).toEqual({ kind: 'turn', dir: 'down' })
  expect(actionFor({ key: 'left' })).toEqual({ kind: 'turn', dir: 'left' })
  expect(actionFor({ key: 'right' })).toEqual({ kind: 'turn', dir: 'right' })
})

test('WASD map to directions, case-insensitively', async () => {
  expect(actionFor({ key: 'w' })).toEqual({ kind: 'turn', dir: 'up' })
  expect(actionFor({ key: 'A' })).toEqual({ kind: 'turn', dir: 'left' })
  expect(actionFor({ key: 'S' })).toEqual({ kind: 'turn', dir: 'down' })
  expect(actionFor({ key: 'd' })).toEqual({ kind: 'turn', dir: 'right' })
})

test('p pauses, n starts a new game', async () => {
  expect(actionFor({ key: 'p' })).toEqual({ kind: 'pause' })
  expect(actionFor({ key: 'n' })).toEqual({ kind: 'new' })
})

test('unbound and modified keys are ignored', async () => {
  expect(actionFor({ key: 'q' })).toBe(null)
  expect(actionFor({ key: 'w', ctrl: true })).toBe(null)
  expect(actionFor({ key: 'a', meta: true })).toBe(null)
})
