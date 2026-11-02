import type { ClientElements, RenderElement } from 'claude-code'

import { BURST_TTL, CELL_COLS, UFO_ROW } from './constants.ts'
import type { Burst, EnemyType, InvadersState, Status } from './types.ts'

// Cohesive retro palette on the dark pane: cool enemy gradient, a near-white
// hero, one warm pink UFO, amber shields, and clearly separated bullet colours.
const ACCENT = '#5ad1e6' // border + title, cyan
const PLAYER = '#f8f8f2' // hero ship — near-white, pops at the bottom
const PBULLET = '#fde047' // player shots, yellow
const EBULLET = '#ef4444' // enemy shots + lives, red
const UFO = '#ff6ac1' // mystery ship — hot pink, the one warm accent up top
const BUNKER = '#f59e0b' // shields — amber, reads as a structure
const BURST = '#fff8c4' // kill flash / floating score — pale bright
const DIM = '#59636f'
const INK = '#e6edf3'

// Player jet: 2 cells wide (4 chars) × 2 rows — swept wings over a fuselage.
const JET_TOP = '▟▀▀▙' // nose ridge + wings
const JET_BOT = '▘▐▌▝' // fuselage with thruster nubs
// Mystery ship: 1 cell wide × 2 rows.
const UFO_TOP_G = '▟▙' // dome
const UFO_BOT_G = '▜▛' // saucer rim

// Aliens are 2 cells wide (4 chars) and waddle: a 2-frame march animation with
// legs that flip down/up. The centre pair is the body, the outer pair the legs.
const EGLYPH: Record<EnemyType, readonly [string, string]> = {
  0: ['▖▚▞▗', '▘▚▞▝'],
  1: ['▖▙▟▗', '▘▙▟▝'],
  2: ['▖▜▛▗', '▘▜▛▝'],
}
// Cool gradient, top (valuable) → front: lavender, mint, sky — all distinct
// from the white ship, pink UFO and amber shields.
const ECOLOR: Record<EnemyType, string> = { 0: '#60a5fa', 1: '#6ee7b7', 2: '#c792ea' }
const PSHOT = '▐▌' // player bolt — a weighty centred bar
const ESHOT = '▞▚' // enemy bolt — a weighty zigzag, distinct from the player's
const BGLYPH = '▓▓' // shield cell (crumbly look as it erodes)
const EMPTY = ' '.repeat(CELL_COLS)

// A burst spans two cells (4 cols) so the row width never changes.
const WIDE = CELL_COLS * 2
const burstLabel = (b: Burst): string => (`+${b.points}` + '    ').slice(0, WIDE)

// Explosion animation, 4 chars (2 cells) per frame, newest (age 0) → fading.
const EXPL = ['▟▓▓▙', '▒▚▞▒', '░▖▗░', '▘░░▝'] as const
const explAt = (age: number): string => EXPL[Math.min(Math.max(age, 0), EXPL.length - 1)] ?? '    '

// Invader kill: orange blast then the rising +score. Ship hit: a red blast.
const EXPL_HOT = '#ffb347'
const burstGlyph = (b: Burst): string => {
  const age = BURST_TTL - b.t
  if (b.kind === 'player') return explAt(age)
  return age <= 1 ? explAt(age) : burstLabel(b)
}
const burstColor = (b: Burst): string => {
  if (b.kind === 'player') return EBULLET
  return BURST_TTL - b.t <= 1 ? EXPL_HOT : BURST
}

const STATUS: Record<Status, { label: string; color: string; hint: string }> = {
  ready: { label: 'READY', color: ACCENT, hint: 'Click, then ← → / A D move · Space fire' },
  running: { label: 'PLAYING', color: '#7ee787', hint: '← → / A D move · Space fire · P pause · N new' },
  paused: { label: 'PAUSED', color: '#f2cc60', hint: 'P resume · N new game' },
  wave_cleared: { label: 'WAVE CLEAR', color: ACCENT, hint: 'Next wave incoming…' },
  game_over: { label: 'GAME OVER', color: EBULLET, hint: 'N new game · or click to restart' },
}

const stat = (el: ClientElements, label: string, value: number): RenderElement => {
  const { Box, Text } = el
  return (
    <Box flexDirection="row">
      <Text color={DIM}>{label} </Text>
      <Text bold color={INK}>
        {String(value)}
      </Text>
    </Box>
  )
}

// Pure: current state -> element tree. No timers, input, or storage here.
export function renderInvaders(
  el: ClientElements,
  st: { readonly game: InvadersState; readonly best: number },
): RenderElement {
  const { Box, Text } = el
  const g = st.game
  const meta = STATUS[g.status]
  const playerRow = g.height - 1
  const shipTopRow = playerRow - 1
  const ufoBotRow = UFO_ROW + 1
  const frame = ((g.marchFrame % 2) + 2) % 2 // 0 or 1, even for negatives
  const k = (x: number, y: number): number => y * g.width + x

  const enemyAt = new Map<number, EnemyType>()
  for (const e of g.enemies) enemyAt.set(k(e.x, e.y), e.type)
  const pSet = new Set(g.pBullets.map(b => k(b.x, b.y)))
  const eSet = new Set(g.eBullets.map(b => k(b.x, b.y)))
  const bunkerSet = new Set(g.bunkers.map(c => k(c.x, c.y)))
  const burstAt = new Map<number, Burst>()
  for (const b of g.bursts) if (b.y >= 0) burstAt.set(k(b.x, b.y), b)

  const ufoTopKey = g.ufo ? k(g.ufo.x, UFO_ROW) : -1
  const ufoBotKey = g.ufo ? k(g.ufo.x, ufoBotRow) : -1
  const shipBotKey = k(g.player, playerRow)
  const shipTopKey = shipTopRow >= 0 ? k(g.player, shipTopRow) : -1

  const rowHasContent = (y: number): boolean =>
    y === playerRow ||
    y === shipTopRow ||
    (g.ufo !== null && (y === UFO_ROW || y === ufoBotRow)) ||
    g.enemies.some(e => e.y === y) ||
    g.pBullets.some(b => b.y === y) ||
    g.eBullets.some(b => b.y === y) ||
    g.bunkers.some(c => c.y === y) ||
    g.bursts.some(b => b.y === y)

  const rows: RenderElement[] = []
  for (let y = 0; y < g.height; y++) {
    // Sparse rows (most of the board) draw as one spacer, not width cells.
    if (!rowHasContent(y)) {
      rows.push(
        <Box key={`r${y}`} flexDirection="row">
          <Text>{EMPTY.repeat(g.width)}</Text>
        </Box>,
      )
      continue
    }
    const cells: RenderElement[] = []
    let x = 0
    while (x < g.width) {
      const cell = k(x, y)
      const wide = x <= g.width - 2 // room for a 2-cell sprite
      const type = enemyAt.get(cell)
      // 2-cell-wide sprites: burst, the jet, and the aliens.
      const burst = burstAt.get(cell)
      if (burst && wide) {
        cells.push(<Text key={`c${x}`} bold color={burstColor(burst)}>{burstGlyph(burst)}</Text>)
        x += 2
        continue
      }
      if (cell === shipBotKey && wide) {
        cells.push(<Text key={`c${x}`} bold color={PLAYER}>{JET_BOT}</Text>)
        x += 2
        continue
      }
      if (cell === shipTopKey && wide) {
        cells.push(<Text key={`c${x}`} bold color={PLAYER}>{JET_TOP}</Text>)
        x += 2
        continue
      }
      if (type !== undefined && wide) {
        cells.push(<Text key={`c${x}`} color={ECOLOR[type]}>{EGLYPH[type][frame]}</Text>)
        x += 2
        continue
      }
      // 1-cell items.
      if (cell === ufoTopKey) cells.push(<Text key={`c${x}`} bold color={UFO}>{UFO_TOP_G}</Text>)
      else if (cell === ufoBotKey) cells.push(<Text key={`c${x}`} bold color={UFO}>{UFO_BOT_G}</Text>)
      else if (bunkerSet.has(cell)) cells.push(<Text key={`c${x}`} color={BUNKER}>{BGLYPH}</Text>)
      else if (pSet.has(cell)) cells.push(<Text key={`c${x}`} color={PBULLET}>{PSHOT}</Text>)
      else if (eSet.has(cell)) cells.push(<Text key={`c${x}`} color={EBULLET}>{ESHOT}</Text>)
      else cells.push(<Text key={`c${x}`}>{EMPTY}</Text>)
      x += 1
    }
    rows.push(
      <Box key={`r${y}`} flexDirection="row">
        {cells}
      </Box>,
    )
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={ACCENT}>
          ARCADE · INVADERS
        </Text>
        <Text bold color={meta.color}>
          {meta.label}
        </Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        {stat(el, 'SCORE', g.score)}
        <Box flexDirection="row">
          <Text color={DIM}>LIVES </Text>
          <Text bold color={EBULLET}>
            {g.lives > 0 ? '♥'.repeat(g.lives) : '—'}
          </Text>
        </Box>
        {stat(el, 'WAVE', g.wave)}
        {stat(el, 'BEST', st.best)}
      </Box>
      <Box flexDirection="column" borderStyle="bold" borderColor={ACCENT}>
        {rows}
      </Box>
      <Text color={DIM}>{meta.hint}</Text>
    </Box>
  )
}
