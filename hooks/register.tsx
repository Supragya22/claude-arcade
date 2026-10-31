import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Cell, Scores } from '../types'
import { applyPlayerMove, newGame } from './engine.ts'
import { applyAiMove } from './ai.ts'
import { getTheme, nextTheme, THEME_IDS } from './themes.ts'
import { mascotFor, pickFrame, type MascotState } from './mascots.ts'
import { spriteToRaster } from './sprite.ts'
import { textToRaster } from './font.ts'
import { festivalThemeFor } from './festivals.ts'

const PANE = 'arcade'
const PANE_ROWS = 36
const PANE_COLS = 36
const AI_DELAY_MS = 350
const FRAME_MS = 420
const FRAME_WRAP = 600
const FLASH_MS = 220
const SCORES_KEY = 'scores'
const THEME_KEY = 'theme'
const MOTION_KEY = 'motion'
const SOUND_KEY = 'sound'
const AUTO_KEY = 'themeAuto'

const game = atom({ plugin: 'arcade', key: 'game' } as const, newGame(), { shape: 'ttt-3' })
const scores = atom({ plugin: 'arcade', key: 'scores' } as const, { x: 0, o: 0, draws: 0 }, {
  shape: 'sc-1',
})
const theme = atom({ plugin: 'arcade', key: 'theme' } as const, 'classic')
const frame = atom({ plugin: 'arcade', key: 'frame' } as const, 0)
const flash = atom({ plugin: 'arcade', key: 'flash' } as const, -1)
const wipe = atom({ plugin: 'arcade', key: 'wipe' } as const, -1)
const motion = atom({ plugin: 'arcade', key: 'motion' } as const, true)
const sound = atom({ plugin: 'arcade', key: 'sound' } as const, false)
const themeAuto = atom({ plugin: 'arcade', key: 'themeAuto' } as const, true)
const minimized = atom({ plugin: 'arcade', key: 'minimized' } as const, false)

// Module-scoped timers: a hot reload drops them, which is fine.
let aiTimer: { cancel: () => void } | null = null
let animTimer: { cancel: () => void } | null = null
let flashTimer: { cancel: () => void } | null = null
let wipeTimer: { cancel: () => void } | null = null

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))
const isScores = (v: unknown): v is Scores =>
  typeof v === 'object' && v !== null && 'x' in v && 'o' in v && 'draws' in v

// Pixel-art marks (7×7). '#' = the mark colour, '.' = transparent.
const X_GLYPH = ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']
const O_GLYPH = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..']

// The number with a one-space margin; centred in the cell by flex.
const cellLabel = (n: number): string => ` ${n} `

// One central scheduler drives every animation (mascot frames + win pulse).
function startAnim($: EngineInterface): void {
  animTimer?.cancel()
  animTimer = $.clock.every(FRAME_MS, () => void update($, frame, f => (f + 1) % FRAME_WRAP))
}
function stopAnim($: EngineInterface): void {
  animTimer?.cancel()
  animTimer = null
  void update($, frame, () => 0)
}

// Briefly flash a just-placed mark (skipped under reduced motion).
async function flashCell($: EngineInterface, cell: number): Promise<void> {
  if (!(await read($, motion))) return
  flashTimer?.cancel()
  await update($, flash, () => cell)
  flashTimer = $.clock.after(FLASH_MS, () => void update($, flash, () => -1))
}

async function playSfx(
  $: EngineInterface,
  name: 'place' | 'win' | 'lose' | 'draw',
): Promise<void> {
  if (!(await read($, sound))) return
  await $.audio.play({ asset: `sounds/${name}.wav` }).catch(() => undefined)
}

async function recordResult($: EngineInterface): Promise<void> {
  const g = await read($, game)
  if ((g.status === 'win' || g.status === 'draw') && !g.recorded) {
    await update($, scores, s => ({
      x: s.x + (g.winner === 'X' ? 1 : 0),
      o: s.o + (g.winner === 'O' ? 1 : 0),
      draws: s.draws + (g.status === 'draw' ? 1 : 0),
    }))
    await update($, game, cur => ({ ...cur, recorded: true }))
    await $.store.set(SCORES_KEY, await read($, scores))
    await playSfx($, g.status === 'draw' ? 'draw' : g.winner === 'X' ? 'win' : 'lose')
  }
}

function scheduleAi($: EngineInterface): void {
  aiTimer?.cancel()
  aiTimer = $.clock.after(AI_DELAY_MS, async () => {
    aiTimer = null
    const before = (await read($, game)).board
    await update($, game, g => applyAiMove(g))
    const after = await read($, game)
    const oCell = after.board.findIndex((c, idx) => c === 'O' && before[idx] === null)
    if (oCell >= 0) {
      await flashCell($, oCell)
      await playSfx($, 'place')
    }
    await recordResult($)
  })
}

async function playCell($: EngineInterface, i: number): Promise<void> {
  const before = await read($, game)
  if (before.status !== 'play' || before.board[i] !== null) return
  await update($, game, g => applyPlayerMove(g, i))
  await flashCell($, i)
  await playSfx($, 'place')
  const g = await read($, game)
  if (g.status === 'win' || g.status === 'draw') await recordResult($)
  else if (g.status === 'ai') scheduleAi($)
}

async function resetGame($: EngineInterface): Promise<void> {
  aiTimer?.cancel()
  aiTimer = null
  await update($, flash, () => -1)
  wipeTimer?.cancel()
  wipeTimer = null

  if (!(await read($, motion))) {
    await update($, wipe, () => -1)
    await update($, game, () => newGame())

    return
  }

  // Sweep the old board away cell by cell, then deal a fresh one.
  let k = 0
  await update($, wipe, () => 0)
  wipeTimer = $.clock.every(55, () => {
    k += 1
    if (k > 9) {
      wipeTimer?.cancel()
      wipeTimer = null
      void update($, wipe, () => -1)
      void update($, game, () => newGame())
    } else {
      void update($, wipe, () => k)
    }
  })
}

async function closePane($: EngineInterface): Promise<void> {
  aiTimer?.cancel()
  aiTimer = null
  wipeTimer?.cancel()
  wipeTimer = null
  stopAnim($)
  await $.ui.close({ id: PANE })
}

async function openPane($: EngineInterface): Promise<{ isPlaced: boolean; reason?: string }> {
  // Re-check the seasonal theme on open so auto-mode tracks the date without a restart.
  if (await read($, themeAuto)) {
    await applyTheme($, festivalThemeFor(new Date(await $.clock.now())) ?? 'classic', false)
  }
  const opened = await $.ui.open({
    id: PANE,
    title: 'Claude Arcade',
    rows: PANE_ROWS,
    columns: PANE_COLS,
    backgroundColor: 'transparent',
  })
  await update($, minimized, () => false)
  if (await read($, motion)) startAnim($)

  return opened
}

// Set the theme. `manual` turns auto-selection off (a manual choice wins).
// Minimise hides the whole panel (like the Naruto band fold): the pane closes,
// freeing all its space, and a one-line hint appears above the prompt to
// restore it. Closing this way is origin `plugin`, so the score is NOT reset.
async function minimizePane($: EngineInterface): Promise<void> {
  await update($, minimized, () => true)
  stopAnim($)
  await $.ui.close({ id: PANE })
}

async function applyTheme($: EngineInterface, id: string, manual: boolean): Promise<void> {
  await update($, theme, () => id)
  await $.store.set(THEME_KEY, id)
  if (manual) {
    await update($, themeAuto, () => false)
    await $.store.set(AUTO_KEY, false)
  }
}

async function cycleTheme($: EngineInterface): Promise<void> {
  await applyTheme($, nextTheme(await read($, theme)), true)
}

async function enableAuto($: EngineInterface): Promise<string> {
  await update($, themeAuto, () => true)
  await $.store.set(AUTO_KEY, true)
  const id = festivalThemeFor(new Date(await $.clock.now())) ?? 'classic'
  await applyTheme($, id, false)

  return id
}

function mascotState(g: { status: string; winner: Cell }): MascotState {
  if (g.status === 'win') return g.winner === 'X' ? 'player_win' : 'ai_win'
  if (g.status === 'draw') return 'draw'
  if (g.status === 'ai') return 'thinking'
  return 'idle'
}

const HELP = [
  'Claude Arcade — Tic-Tac-Toe',
  '',
  '/arcade              open the game',
  '/arcade theme        list themes / current',
  '/arcade theme <id>   switch (classic, halloween, diwali, holi, eid, christmas)',
  '/arcade theme auto   pick the theme by the festival calendar',
  '/arcade motion       toggle animations (reduced motion)',
  '/arcade sound        toggle sound effects (macOS)',
  '/arcade close        close the pane',
  '/arcade help         this help',
  '',
  'You are X, the AI is O. Click a cell to play. N starts a new',
  'game, T cycles the theme. The AI plays near-perfect minimax',
  'but slips occasionally, so you can win now and then.',
  '',
  'You can play while Claude works — clicks register and the',
  'board redraws during active tasks (verified on this build).',
].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'arcade',
      description: 'Open Claude Arcade — Tic-Tac-Toe you can play beside Claude',
      argumentHint: '[theme <id> | motion | sound | close | help]',
    })

    const storedScores = await $.store.get(SCORES_KEY)
    if (isScores(storedScores)) await update($, scores, () => storedScores)
    const storedTheme = await $.store.get(THEME_KEY)
    if (typeof storedTheme === 'string') await update($, theme, () => storedTheme)
    const storedMotion = await $.store.get(MOTION_KEY)
    if (typeof storedMotion === 'boolean') await update($, motion, () => storedMotion)
    const storedSound = await $.store.get(SOUND_KEY)
    if (typeof storedSound === 'boolean') await update($, sound, () => storedSound)
    const storedAuto = await $.store.get(AUTO_KEY)
    if (typeof storedAuto === 'boolean') await update($, themeAuto, () => storedAuto)

    // Auto-select the seasonal theme when enabled (manual choice still wins
    // next time the person picks one).
    if (await read($, themeAuto)) {
      const id = festivalThemeFor(new Date(await $.clock.now())) ?? 'classic'
      await applyTheme($, id, false)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'arcade' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'close') {
      await closePane($)

      return { text: 'Arcade closed.' }
    }
    if (arg === 'help') return { text: HELP }

    if (arg === 'motion') {
      const enabled = !(await read($, motion))
      await update($, motion, () => enabled)
      await $.store.set(MOTION_KEY, enabled)
      if (enabled) startAnim($)
      else stopAnim($)

      return { text: `Animations ${enabled ? 'on' : 'off (reduced motion)'}.` }
    }

    if (arg === 'sound') {
      const enabled = !(await read($, sound))
      await update($, sound, () => enabled)
      await $.store.set(SOUND_KEY, enabled)

      return { text: `Sound ${enabled ? 'on' : 'off'}.` }
    }

    if (arg === 'theme' || arg.startsWith('theme ')) {
      const name = arg.slice('theme'.length).trim()
      if (name === '') {
        return {
          text: `Themes: ${THEME_IDS.join(', ')}. Current: ${await read($, theme)}${
            (await read($, themeAuto)) ? ' (auto)' : ''
          }. Switch with /arcade theme <id>, or /arcade theme auto.`,
        }
      }
      if (name === 'auto') {
        const id = await enableAuto($)

        return { text: `Auto theme on — showing ${id} for today.` }
      }
      if (!(THEME_IDS as readonly string[]).includes(name)) {
        return { text: `Unknown theme "${name}". Available: ${THEME_IDS.join(', ')}.` }
      }
      await applyTheme($, name, true)

      return { text: `Theme set to ${name}.` }
    }

    const opened = await openPane($)

    return {
      text: opened.isPlaced
        ? 'Arcade opened. Click a cell to play — even while Claude is working.'
        : `Arcade could not open: ${opened.reason ?? 'no room in this layout'}`,
    }
  })

  // Closing the pane (the × , the close key, or the Close button) resets the score.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    const result = await next(e)
    // Only a person-initiated close (the ×, close key) resets the score;
    // minimise closes with origin `plugin` and keeps it.
    if (e.origin.kind === 'person') {
      await update($, scores, () => ({ x: 0, o: 0, draws: 0 }))
      await $.store.set(SCORES_KEY, { x: 0, o: 0, draws: 0 })
    }

    return result
  }).catch(($, e, next) => next(e))

  // When minimised, show a one-line "hidden" hint above the prompt (composed
  // with any other mod's band content); clicking it reopens the pane.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (!(await read($, minimized))) return below
    const { Box, Text, Button } = $.ui.resolve(e)
    const hint = (
      <Button key="arcade-show" plain onPress={() => void openPane($)}>
        <Text dimColor>▸ Claude Arcade hidden · click to show</Text>
      </Button>
    )

    return below ? <Box flexDirection="column">{hint}{below}</Box> : hint
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const g = await read($, game)
    const sc = await read($, scores)
    const th = getTheme(await read($, theme))
    const f = await read($, frame)
    const flashed = await read($, flash)
    const wiping = await read($, wipe)
    const motionOn = await read($, motion)


    const cols = e.props?.bodyColumns ?? e.viewport?.columns ?? 24
    const cellW = clamp(Math.floor((cols - 4) / 3), 7, 9)
    const cellH = Math.max(4, Math.round(cellW / 2))
    const boardW = cellW * 3
    const win = new Set(g.line ?? [])
    const winColor = g.status === 'win' && f % 2 === 1 ? th.brand : th.win

    const term = e.surface === 'terminal' ? $.ui.resolve(e) : null
    const Raster = term?.Raster

    let mascot = null
    if (Raster) {
      const m = mascotFor(th.id)
      const r = spriteToRaster(pickFrame(m, mascotState(g), f), m.palette)
      mascot = <Raster key="mascot" columns={r.columns} rows={r.rows} cells={r.cells} />
    }

    const statusText =
      g.status === 'win'
        ? g.winner === 'X'
          ? 'YOU WIN'
          : 'AI WINS'
        : g.status === 'draw'
          ? 'DRAW'
          : g.status === 'ai'
            ? 'THINKING'
            : 'YOUR GO'
    const statusColor =
      g.status === 'win' && g.winner === 'X' ? winColor : g.status === 'win' ? th.o : '#cfd4dd'
    const statusRaster = textToRaster(statusText, statusColor)
    const scoreX = textToRaster(String(sc.x), th.x)
    const scoreO = textToRaster(String(sc.o), th.o)
    const scoreD = textToRaster(String(sc.draws), th.brand)
    const scoreSep = textToRaster(':', th.dim)

    const cellOf = (i: number) => {
      const v: Cell = g.board[i] ?? null
      // During the new-game sweep: cleared cells blank, the rest show their mark
      // (no buttons), clearing left-to-right.
      if (wiping >= 0) {
        if (i < wiping || v === null) return <Text> </Text>
        const wc = v === 'X' ? th.x : th.o
        if (Raster) {
          const r = spriteToRaster(v === 'X' ? X_GLYPH : O_GLYPH, { '.': null, '#': wc })
          return <Box><Raster key={`m-${i}`} columns={r.columns} rows={r.rows} cells={r.cells} /></Box>
        }
        return <Box><Text bold color={wc}>{v}</Text></Box>
      }
      if (v === null) {
        if (g.status !== 'play') return <Text> </Text>
        return (
          <Button key={`cell-${i}`} plain onPress={() => void playCell($, i)}>
            {cellLabel(i + 1)}
          </Button>
        )
      }
      // A just-placed mark flashes white; winning marks recolour.
      const color = i === flashed ? '#ffffff' : win.has(i) ? winColor : v === 'X' ? th.x : th.o
      if (Raster) {
        const r = spriteToRaster(v === 'X' ? X_GLYPH : O_GLYPH, { '.': null, '#': color })
        return <Box><Raster key={`m-${i}`} columns={r.columns} rows={r.rows} cells={r.cells} /></Box>
      }
      return <Box><Text bold color={color}>{v}</Text></Box>
    }
    const tileBg = (row: number, col: number): string =>
      (row + col) % 2 === 0 ? th.tileA : th.tileB

    // Win → colourful confetti; draw → a muted neutral shimmer.
    const isDraw = g.status === 'draw'
    const burstActive = motionOn && (g.status === 'win' || isDraw)
    const burstChars = isDraw ? ['·', '.', '-'] : ['*', '+', '·', '°', '.']
    const burstCols = isDraw ? [th.dim, '#8a93a7', '#6b7280'] : [th.x, th.o, th.win, th.brand]
    const burst = Array.from({ length: boardW + 2 }, (_, i) => ({
      ch: burstChars[(i + f) % burstChars.length] ?? '·',
      color: burstCols[(i + f * 2) % burstCols.length] ?? th.dim,
    }))

    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold color={th.brand}>{th.tag} TIC·TAC·TOE</Text>
          <Button key="min" plain onPress={() => void minimizePane($)}>[-]</Button>
        </Box>
        <Text dimColor>You X · AI O · {th.name}</Text>

        <Box justifyContent="center">{mascot}</Box>
        <Text> </Text>

        {burstActive && (
          <Box justifyContent="center">
            {burst.map((c, i) => (
              <Text key={`cf-${i}`} color={c.color}>{c.ch}</Text>
            ))}
          </Box>
        )}

        <Box justifyContent="center">
          <Box flexDirection="column" borderStyle="bold" borderColor={th.border}>
            {[0, 1, 2].map(row => (
              <Box key={`row-${row}`}>
                {[0, 1, 2].map(col => {
                  const i = row * 3 + col
                  return (
                    <Box
                      key={`cb-${i}`}
                      flexDirection="column"
                      width={cellW}
                      height={cellH}
                      justifyContent="center"
                      backgroundColor={tileBg(row, col)}
                    >
                      <Box justifyContent="center">{cellOf(i)}</Box>
                    </Box>
                  )
                })}
              </Box>
            ))}
          </Box>
        </Box>

        <Text> </Text>
        {Raster ? (
          <Box justifyContent="center">
            <Raster key="status" columns={statusRaster.columns} rows={statusRaster.rows} cells={statusRaster.cells} />
          </Box>
        ) : (
          <Text bold color={statusColor}>{statusText}</Text>
        )}
        <Text> </Text>
        {Raster ? (
          <Box justifyContent="center">
            <Raster key="s-x" columns={scoreX.columns} rows={scoreX.rows} cells={scoreX.cells} />
            <Raster key="s-c1" columns={scoreSep.columns} rows={scoreSep.rows} cells={scoreSep.cells} />
            <Raster key="s-o" columns={scoreO.columns} rows={scoreO.rows} cells={scoreO.cells} />
            <Raster key="s-c2" columns={scoreSep.columns} rows={scoreSep.rows} cells={scoreSep.cells} />
            <Raster key="s-d" columns={scoreD.columns} rows={scoreD.rows} cells={scoreD.cells} />
          </Box>
        ) : (
          <Text dimColor>{`You ${sc.x}  AI ${sc.o}  Draws ${sc.draws}`}</Text>
        )}
        <Text> </Text>

        <Box flexDirection="column">
          <Button key="new" hotkey="n" variant="primary" onPress={() => void resetGame($)}>
            New Game
          </Button>
          <Button key="theme" hotkey="t" onPress={() => void cycleTheme($)}>
            {`Theme: ${th.name}`}
          </Button>
        </Box>
      </Box>
    )
  })
}
