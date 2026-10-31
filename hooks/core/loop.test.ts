import { expect, test } from 'claude-code/testing'

import { createTicker } from './loop.ts'

test('accumulates fractional dt into whole steps', async () => {
  const t = createTicker()
  expect(t.advance(30, 50)).toBe(0) // 30 < 50
  expect(t.advance(30, 50)).toBe(1) // 60 total -> one step, 10 carried
  expect(t.advance(40, 50)).toBe(1) // 50 total -> one step
})

test('a larger dt yields several steps in one advance', async () => {
  const t = createTicker()
  expect(t.advance(160, 50)).toBe(3) // 150 -> 3 steps, 10 carried
})

test('speed change is honored without resetting the accumulator', async () => {
  const t = createTicker()
  expect(t.advance(40, 50)).toBe(0) // 40 carried
  expect(t.advance(0, 30)).toBe(1) // 40 >= new 30 -> one step immediately
})

test('long stall is capped (no spiral of death)', async () => {
  const t = createTicker()
  expect(t.advance(100000, 50)).toBe(5) // capped at MAX_CATCHUP
  expect(t.advance(50, 50)).toBe(1) // accumulator was cleared, resumes clean
})

test('reset clears carried time', async () => {
  const t = createTicker()
  t.advance(40, 50)
  t.reset()
  expect(t.advance(40, 50)).toBe(0)
})
