import type { ThemeId } from './themes.ts'

// Optional auto-theme by date. No network: a maintained local table. Festival
// dates that move each year (Holi, Diwali, Eid) live under the year; fixed-date
// windows (Halloween, Christmas) apply every year. Outside any window → null,
// and the caller falls back to Classic.
//
// Dates below are the commonly-observed Gregorian dates; Eid in particular is
// moon-sighted and can shift ±1 day by region, so windows are a little wide.
// 2027 entries are projections — verify against an authoritative calendar, and
// extend this table in future years.

type Window = { from: string; to: string; theme: ThemeId } // 'MM-DD', inclusive

const FIXED: readonly Window[] = [
  { from: '10-25', to: '11-02', theme: 'halloween' }, // Halloween, Oct 31
  { from: '12-18', to: '12-27', theme: 'christmas' }, // Christmas, Dec 25
]

const BY_YEAR: Record<number, readonly Window[]> = {
  2025: [
    { from: '03-13', to: '03-15', theme: 'holi' }, // Holi — Mar 14
    { from: '03-30', to: '04-01', theme: 'eid' }, // Eid al-Fitr — ~Mar 31
    { from: '06-06', to: '06-08', theme: 'eid' }, // Eid al-Adha — ~Jun 7
    { from: '10-20', to: '10-22', theme: 'diwali' }, // Diwali — Oct 20/21
  ],
  2026: [
    { from: '03-03', to: '03-05', theme: 'holi' }, // Holi — Mar 4
    { from: '03-19', to: '03-21', theme: 'eid' }, // Eid al-Fitr — ~Mar 20
    { from: '05-26', to: '05-28', theme: 'eid' }, // Eid al-Adha — ~May 27
    { from: '11-07', to: '11-09', theme: 'diwali' }, // Diwali — Nov 8
  ],
  2027: [
    { from: '03-21', to: '03-23', theme: 'holi' }, // Holi — ~Mar 22 (projected)
    { from: '03-09', to: '03-11', theme: 'eid' }, // Eid al-Fitr — ~Mar 10 (projected)
    { from: '05-15', to: '05-17', theme: 'eid' }, // Eid al-Adha — ~May 16 (projected)
    { from: '10-28', to: '10-30', theme: 'diwali' }, // Diwali — ~Oct 29 (projected)
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
