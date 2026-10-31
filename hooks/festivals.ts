import type { ThemeId } from './themes.ts'

// Optional auto-theme by date. No network: a maintained local table. Festival
// dates that move each year (Holi, Diwali, Eid) live under the year; fixed-date
// windows (Halloween, Christmas) apply every year. Outside any window → null,
// and the caller falls back to Classic.
//
// NOTE: the lunar/luni-solar dates below are APPROXIMATE and should be checked
// against an authoritative calendar before relying on them.

type Window = { from: string; to: string; theme: ThemeId } // 'MM-DD', inclusive

const FIXED: readonly Window[] = [
  { from: '10-25', to: '11-02', theme: 'halloween' },
  { from: '12-18', to: '12-27', theme: 'christmas' },
]

const BY_YEAR: Record<number, readonly Window[]> = {
  2025: [
    { from: '03-13', to: '03-15', theme: 'holi' },
    { from: '03-29', to: '03-31', theme: 'eid' },
    { from: '10-19', to: '10-22', theme: 'diwali' },
  ],
  2026: [
    { from: '03-03', to: '03-04', theme: 'holi' },
    { from: '03-19', to: '03-21', theme: 'eid' },
    { from: '11-07', to: '11-09', theme: 'diwali' },
  ],
  2027: [
    { from: '03-21', to: '03-23', theme: 'holi' },
    { from: '03-08', to: '03-10', theme: 'eid' },
    { from: '10-28', to: '10-30', theme: 'diwali' },
  ],
}

const inWindow = (mmdd: string, w: Window): boolean => mmdd >= w.from && mmdd <= w.to

// The festival theme for `date`, or null when no festival is in season.
export function festivalThemeFor(date: Date): ThemeId | null {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const mmdd = `${mm}-${dd}`
  for (const w of BY_YEAR[date.getFullYear()] ?? []) if (inWindow(mmdd, w)) return w.theme
  for (const w of FIXED) if (inWindow(mmdd, w)) return w.theme
  return null
}
