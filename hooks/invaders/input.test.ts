import { expect, test } from 'claude-code/testing'

import { actionFor } from './input.ts'

test('arrows and A/D map to horizontal moves', async () => {
  expect(actionFor({ key: 'left' })).toEqual({ kind: 'move', dx: -1 })
  expect(actionFor({ key: 'right' })).toEqual({ kind: 'move', dx: 1 })
  expect(actionFor({ key: 'a' })).toEqual({ kind: 'move', dx: -1 })
  expect(actionFor({ key: 'D' })).toEqual({ kind: 'move', dx: 1 })
})

test('space fires, P pauses, N starts a new game', async () => {
  expect(actionFor({ key: ' ' })).toEqual({ kind: 'fire' })
  expect(actionFor({ key: 'space' })).toEqual({ kind: 'fire' })
  expect(actionFor({ key: 'p' })).toEqual({ kind: 'pause' })
  expect(actionFor({ key: 'n' })).toEqual({ kind: 'new' })
})

test('unbound and modified keys are ignored', async () => {
  expect(actionFor({ key: 'q' })).toBe(null)
  expect(actionFor({ key: 'left', ctrl: true })).toBe(null)
  expect(actionFor({ key: ' ', meta: true })).toBe(null)
})
