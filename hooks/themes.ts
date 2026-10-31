// Configuration-driven themes. A theme is a palette plus a header tag;
// terminal-safe (no width-risky glyphs in cells). Add a theme = add an entry.

export type ThemeId = 'classic' | 'halloween' | 'diwali' | 'holi' | 'eid' | 'christmas'

export type ThemeConfig = {
  id: ThemeId
  name: string
  tag: string // short header decoration (header line only, never a cell)
  brand: string // brand / header color
  border: string // board frame
  tileA: string // cell background, checkerboard shade A
  tileB: string // cell background, checkerboard shade B
  x: string // X mark
  o: string // O mark
  win: string // winning-tile highlight
  bg: string // contrast colour for marks on a highlighted tile
  dim: string // empty-cell digits / muted text
}

const THEMES: Record<ThemeId, ThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    tag: '◆',
    brand: '#f2c14e',
    border: '#f2c14e', // gold frame
    tileA: '#1b2236', // slate
    tileB: '#243049', // lighter slate
    x: '#4ade80', // green
    o: '#f87171', // red
    win: '#ffe066', // gold glow
    bg: '#0d0d14',
    dim: '#8b93a7',
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    tag: '🎃',
    brand: '#ff8c1a',
    border: '#ff8c1a', // pumpkin frame
    tileA: '#1a1026', // midnight purple
    tileB: '#261637', // lighter purple
    x: '#ffb347', // orange
    o: '#d9c6ff', // ghost violet
    win: '#ff5db1', // candy magenta glow
    bg: '#120a1c',
    dim: '#8a6fb0',
  },
  diwali: {
    id: 'diwali',
    name: 'Diwali',
    tag: '🪔',
    brand: '#ff9933', // saffron
    border: '#ffd700', // gold frame
    tileA: '#140f33', // indigo
    tileB: '#1e1744', // lighter indigo
    x: '#ff5e3a', // vermilion
    o: '#ffcf4d', // warm gold
    win: '#fff3b0', // ivory glow
    bg: '#0c0922',
    dim: '#b59a6a',
  },
  holi: {
    id: 'holi',
    name: 'Holi',
    tag: '🎨',
    brand: '#ff2d95',
    border: '#ff2d95', // vibrant pink frame
    tileA: '#241633',
    tileB: '#2e1d40',
    x: '#39ff14', // green
    o: '#4dd2ff', // blue
    win: '#ffe600', // yellow
    bg: '#120a1c',
    dim: '#9a7fb0',
  },
  eid: {
    id: 'eid',
    name: 'Eid',
    tag: '🌙',
    brand: '#2ecc9b', // emerald
    border: '#ffd700', // gold frame
    tileA: '#0c2a24', // deep teal
    tileB: '#113b32',
    x: '#5ef2c0', // mint
    o: '#ffd166', // gold
    win: '#eafff6', // ivory glow
    bg: '#07201b',
    dim: '#7fae9f',
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    tag: '🎄',
    brand: '#e8b84b',
    border: '#e23b3b', // festive red frame
    tileA: '#0d2a1a', // evergreen
    tileB: '#123a24',
    x: '#ff5a5a', // red
    o: '#eaffff', // snow white
    win: '#9ef0ff', // ice blue
    bg: '#061a10',
    dim: '#8ab79a',
  },
}

export const THEME_IDS: readonly ThemeId[] = [
  'classic',
  'halloween',
  'diwali',
  'holi',
  'eid',
  'christmas',
]

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v)
}

// Always returns a valid theme; unknown ids fall back to Classic.
export function getTheme(id: unknown): ThemeConfig {
  return isThemeId(id) ? THEMES[id] : THEMES.classic
}

export function nextTheme(id: unknown): ThemeId {
  const cur = isThemeId(id) ? THEME_IDS.indexOf(id) : 0
  return THEME_IDS[(cur + 1) % THEME_IDS.length] ?? 'classic'
}
