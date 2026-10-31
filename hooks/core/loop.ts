// Fixed-step accumulator. One upstream timer (Client surface.every) drives it;
// the logical step rate is variable, so a speed change never spawns a 2nd timer.
// Reusable by future real-time games (e.g. Space Invaders running enemy moves
// and projectiles at independent rates, one ticker each).

const MAX_CATCHUP = 5 // cap steps per advance; avoids a spiral after a long stall

export type Ticker = {
  // How many logical steps elapsed over `dtMs`, given the current step length.
  advance: (dtMs: number, stepMs: number) => number
  reset: () => void
}

export function createTicker(): Ticker {
  let acc = 0
  return {
    advance(dtMs, stepMs) {
      acc += dtMs
      let steps = 0
      while (acc >= stepMs && steps < MAX_CATCHUP) {
        acc -= stepMs
        steps++
      }
      if (steps === MAX_CATCHUP) acc = 0
      return steps
    },
    reset() {
      acc = 0
    },
  }
}
