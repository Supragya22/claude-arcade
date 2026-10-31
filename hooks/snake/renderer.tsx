import type { ClientElements, RenderElement } from 'claude-code'

import { CELL_COLS, levelFor } from './constants.ts'
import type { SnakeState, Status } from './types.ts'

const ACCENT = '#7ee787'
const HEAD = '#a9d94f'
const BODY = '#2a9d45'
const FOOD = '#d43f3a'
const DIM = '#59636f'
const INK = '#e6edf3'
// Filled cells use full-block glyphs (snake/food read solid). Empty cells are
// plain spaces: the pane background shows through both cell and row-seam, so the
// open field stays uniform instead of a grid of blocks separated by seams.
const BLOCK = '█'.repeat(CELL_COLS)
const GAP = ' '.repeat(CELL_COLS)

const STATUS: Record<Status, { label: string; color: string; hint: string }> = {
  ready: { label: 'READY', color: ACCENT, hint: 'Click, then arrows / WASD to start' },
  running: { label: 'PLAYING', color: BODY, hint: 'Arrows / WASD move · P pause · N new' },
  paused: { label: 'PAUSED', color: '#f2cc60', hint: 'P resume · N new game' },
  game_over: { label: 'GAME OVER', color: FOOD, hint: 'N new game · or click to restart' },
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
export function renderSnake(
  el: ClientElements,
  st: { readonly game: SnakeState; readonly best: number },
): RenderElement {
  const { Box, Text } = el
  const g = st.game
  const meta = STATUS[g.status]

  const head = g.snake[0]
  const headKey = head ? head.y * g.width + head.x : -1
  const body = new Set(g.snake.slice(1).map(p => p.y * g.width + p.x))
  const foodKey = g.food.y * g.width + g.food.x

  const rows: RenderElement[] = []
  for (let y = 0; y < g.height; y++) {
    const cells: RenderElement[] = []
    for (let x = 0; x < g.width; x++) {
      const k = y * g.width + x
      const color = k === headKey ? HEAD : body.has(k) ? BODY : k === foodKey ? FOOD : null
      cells.push(color ? <Text color={color}>{BLOCK}</Text> : <Text>{GAP}</Text>)
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
          ARCADE · SNAKE
        </Text>
        <Text bold color={meta.color}>
          {meta.label}
        </Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        {stat(el, 'SCORE', g.score)}
        {stat(el, 'BEST', st.best)}
        {stat(el, 'LV', levelFor(g.score))}
      </Box>
      <Box flexDirection="column" borderStyle="bold" borderColor={ACCENT}>
        {rows}
      </Box>
      <Text color={DIM}>{meta.hint}</Text>
    </Box>
  )
}
