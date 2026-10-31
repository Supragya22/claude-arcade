import type { Frame, Palette } from './sprite.ts'

// A mascot reacts to the game. Each state has one or more frames the scheduler
// advances through. Real pixel art on a shared 16×16 canvas. Derived frames
// (blink/glow/flame/colour-cycle) are made by swapping palette chars, so the
// base art stays consistent across a mascot's frames.

export type MascotState = 'idle' | 'thinking' | 'player_win' | 'ai_win' | 'draw'
export type Mascot = { palette: Palette; frames: Record<MascotState, Frame[]> }

const swap = (f: readonly string[], from: string, to: string): Frame =>
  f.map(r => r.split(from).join(to))

// ── Classic: orange tabby cat ───────────────────────────────────────────────
const CAT_PALETTE: Palette = {
  '.': null,
  K: '#2a1d12',
  O: '#ff9b3d',
  W: '#fff5e6',
  E: '#17110b',
  P: '#ff8fa3',
  R: '#e8433b',
  Y: '#ffcf3a',
  o: '#d9701f',
  d: '#8a7a66',
}
const CAT = [
  '....K......K....',
  '...KOK....KOK...',
  '...KOOK..KOOK...',
  '..KOOOKKKKOOOK..',
  '..KWWWWWWWWWWK..',
  '.KWWWWWWWWWWWWK.',
  '.KWEEWWWWWWEEWK.',
  '.KWEEWWWWWWEEWK.',
  '.KWWWWWPPWWWWWK.',
  '.KWWWWPPPPWWWWK.',
  '.KWWWWWWWWWWWWK.',
  '..KWWWWWWWWWWK..',
  '..KRRRRYYRRRRK..',
  '.KWWWWWWWWWWWoK.',
  '.KWWWWWWWWWWooK.',
  '..KKKKKKKKKKKK..',
]
const CLASSIC: Mascot = {
  palette: CAT_PALETTE,
  frames: {
    idle: [CAT, CAT, CAT, swap(CAT, 'E', 'W')],
    thinking: [CAT, swap(CAT, 'E', 'W')],
    player_win: [CAT, swap(CAT, 'E', 'W')],
    ai_win: [swap(CAT, 'E', 'd')],
    draw: [CAT],
  },
}

// ── Halloween: jack-o'-lantern ──────────────────────────────────────────────
const PUMPKIN_PALETTE: Palette = {
  '.': null,
  K: '#1a0f05',
  O: '#ff8c1a',
  H: '#ffb347',
  G: '#6b8e23',
  g: '#4a6318',
  E: '#0a0600',
  Y: '#ffd24d',
  L: '#fff3a0',
}
const PUMPKIN = [
  '.......GG.......',
  '.......Gg.......',
  '....KKKGgKKK....',
  '..KKOOOOOOOOKK..',
  '.KOOHOOOOOOHOOK.',
  'KOOOOOOOOOOOOOOK',
  'KOOEEOOOOOOEEOOK',
  'KOOEEOOOOOOEEOOK',
  'KOOOOEOOOOEOOOOK',
  'KOOOOOOOOOOOOOOK',
  'KOEEOOOOOOOOEEOK',
  'KOOEEOOOOOOEEOOK',
  'KOOOEEOOOOEEOOOK',
  '.KOOOEEEEEEOOOK.',
  '.KOOOOOOOOOOOOK.',
  '..KKOOOOOOOOKK..',
]
const HALLOWEEN: Mascot = {
  palette: PUMPKIN_PALETTE,
  frames: {
    idle: [PUMPKIN, swap(PUMPKIN, 'E', 'Y')],
    thinking: [swap(PUMPKIN, 'E', 'Y'), PUMPKIN],
    player_win: [swap(PUMPKIN, 'E', 'Y'), swap(PUMPKIN, 'E', 'L')],
    ai_win: [PUMPKIN],
    draw: [PUMPKIN],
  },
}

// ── Diwali: ornate mandala diya ─────────────────────────────────────────────
const DIYA_PALETTE: Palette = {
  '.': null,
  K: '#2a1838',
  P: '#8a4fbf', // purple petal
  p: '#ff5db1', // pink petal
  Y: '#ffd24d', // gold outline
  o: '#c1572b', // clay
  f: '#ff7a1a', // flame
  F: '#ffe066', // flame bright
  w: '#3a2a1a', // wick
}
const DIYA = [
  '.......YY.......',
  '.....YYppYY.....',
  '....YppPPppY....',
  '...YppPKKPppY...',
  '..YppPKffKPppY..',
  '..YppPKFFKPppY..',
  '..YppPKFFKPppY..',
  '...YppPwwPppY...',
  '....YppooppY....',
  '.....YooooY.....',
  '...oooooooooo...',
  '..oooooooooooo..',
  '...oooooooooo...',
  '....KKKKKKKK....',
  '.....pp..pp.....',
  '.......pp.......',
]
const DIWALI: Mascot = {
  palette: DIYA_PALETTE,
  frames: {
    idle: [DIYA, swap(DIYA, 'F', 'f')],
    thinking: [swap(DIYA, 'F', 'f'), DIYA],
    player_win: [DIYA, swap(DIYA, 'p', 'Y')], // petals flare gold
    ai_win: [swap(swap(DIYA, 'F', 'w'), 'f', 'w')], // flame gutters out
    draw: [DIYA],
  },
}

// ── Holi: colour-powder splash ──────────────────────────────────────────────
const SPLASH_PALETTE: Palette = {
  '.': null,
  p: '#ff4fa3',
  y: '#ffe600',
  g: '#39ff14',
  c: '#4dd2ff',
  m: '#c04fff',
  r: '#ff5a3c',
}
const SPLASH = [
  '.....pppppp.....',
  '...pppppppppp...',
  '..yyyyyyyyyyyy..',
  '..yyyyyyyyyyyy..',
  '.gggggggggggggg.',
  '.gggggggggggggg.',
  'cccccccccccccccc',
  'cccccccccccccccc',
  '.mmmmmmmmmmmmmm.',
  '.mmmmmmmmmmmmmm.',
  '..rrrrrrrrrrrr..',
  '...rrrrrrrrrr...',
  '.....rrrrrr.....',
  '..p..........y..',
  '....g......c....',
  '.......mm.......',
]
const ROT: Record<string, string> = { p: 'y', y: 'g', g: 'c', c: 'm', m: 'r', r: 'p' }
const cycle = (f: Frame): Frame => f.map(row => [...row].map(ch => ROT[ch] ?? ch).join(''))
const HOLI: Mascot = {
  palette: SPLASH_PALETTE,
  frames: {
    idle: [SPLASH, cycle(SPLASH), cycle(cycle(SPLASH))],
    thinking: [cycle(SPLASH), SPLASH],
    player_win: [SPLASH, cycle(SPLASH)],
    ai_win: [SPLASH],
    draw: [SPLASH],
  },
}

// ── Eid: figure praying on a mat ────────────────────────────────────────────
const PRAY_PALETTE: Palette = {
  '.': null,
  K: '#16213a',
  W: '#ffffff',
  S: '#c88a5a',
  E: '#16213a',
  M: '#c0392b',
  G: '#2ecc71',
  g: '#1e8e4f',
  Y: '#ffd24d',
}
const PRAY = [
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '....WSSSSSSW....',
  '...WSSSSSSSSW...',
  '...WSEESSEESW...',
  '...WSSSMMSSSW...',
  '....WSSSSSSW....',
  '...WWWWWWWWWW...',
  '..WWWWWWWWWWWW..',
  '..WWWWSSSSWWWW..',
  '..WWWWSSSSWWWW..',
  '..WWWWWWWWWWWW..',
  '..WWWWWWWWWWWW..',
  '.YGGGGGGGGGGGGY.',
  '.YggggggggggggY.',
  '..KKKKKKKKKKKK..',
]
const EID: Mascot = {
  palette: PRAY_PALETTE,
  frames: {
    idle: [PRAY, PRAY, PRAY, swap(PRAY, 'E', 'S')], // blink
    thinking: [PRAY, swap(PRAY, 'E', 'S')],
    player_win: [PRAY, swap(PRAY, 'E', 'S')],
    ai_win: [PRAY],
    draw: [PRAY],
  },
}

// ── Christmas: snowman ──────────────────────────────────────────────────────
const SNOW_PALETTE: Palette = {
  '.': null,
  K: '#1a1a1a',
  W: '#ffffff',
  S: '#d8e4ee',
  H: '#3a3340',
  N: '#ff8c2a',
  R: '#e23b3b',
  B: '#7a5230',
  I: '#bfe9ff',
}
const SNOWMAN = [
  '..I...HHHH...I..',
  '......HHHH......',
  '....HHHHHHHH....',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWKWWWWKWW...',
  '...WWWWNNWWWW...',
  '...WWWWWWWWWW...',
  '..BRRRRRRRRRRB..',
  '..BWWWWWWWWWWB..',
  '.WWWWWKWWWWWWWW.',
  '.WWWWWWWWWWWWWW.',
  '.WWWWWWKWWWWWWW.',
  '.WWWWWWWWWWWWWW.',
  '..WWWWWWWWWWWW..',
  '..SSSSSSSSSSSS..',
]
const CHRISTMAS: Mascot = {
  palette: SNOW_PALETTE,
  frames: {
    idle: [SNOWMAN, swap(SNOWMAN, 'I', '.')], // snowflakes twinkle
    thinking: [swap(SNOWMAN, 'I', '.'), SNOWMAN],
    player_win: [SNOWMAN, swap(SNOWMAN, 'I', '.')],
    ai_win: [SNOWMAN],
    draw: [SNOWMAN],
  },
}

const MASCOTS: Record<string, Mascot> = {
  classic: CLASSIC,
  halloween: HALLOWEEN,
  diwali: DIWALI,
  holi: HOLI,
  eid: EID,
  christmas: CHRISTMAS,
}

export function mascotFor(themeId: string): Mascot {
  return MASCOTS[themeId] ?? CLASSIC
}

export function pickFrame(mascot: Mascot, state: MascotState, frame: number): Frame {
  const frames = mascot.frames[state]
  const chosen = frames[frame % frames.length] ?? frames[0]
  if (chosen) return chosen
  const idle = mascot.frames.idle[0]
  return idle ?? []
}
