# Claude Arcade

A tiny arcade that lives in a Claude Code pane, so you can play **Tic-Tac-Toe
while Claude works**. The board stays interactive during active tasks — clicks
register and it redraws mid-turn — without using any Claude tokens (the AI runs
locally). It coexists with other mods and keeps to its own pane.

## Install

At a terminal Claude Code prompt:

```
/plugin install arcade --marketplace Supragya22/claude-arcade
```

(Press `y` to add the marketplace, then pick a scope. From a shell, use
`claude plugin install arcade --marketplace Supragya22/claude-arcade`.)

## Play

- `/arcade` — open the game. Click any cell to place your **X**; the AI plays **O**.
- The AI is near-perfect minimax but **slips occasionally**, so you can win now
  and then; play well and most games draw.
- Mouse: click a cell, New Game, Theme, or Close.

## Commands

| Command | What it does |
| --- | --- |
| `/arcade` | Open the pane |
| `/arcade theme` | List themes and the current one |
| `/arcade theme <id>` | Switch theme: `classic`, `halloween`, `diwali`, `holi`, `eid`, `christmas` |
| `/arcade theme auto` | Pick the theme from a local festival calendar |
| `/arcade motion` | Toggle animations (reduced motion) |
| `/arcade sound` | Toggle sound effects (macOS only) |
| `/arcade close` | Close the pane |
| `/arcade help` | Show help |

## Themes

Six seasonal themes, each with its own palette and an animated pixel-art mascot
(a cat, a jack-o'-lantern, a diya, a Holi colour-splash, a praying figure, a
snowman). Switching themes preserves the game in progress and the score.

## Notes & limitations

- **Terminal, mouse-first.** Pixel-art marks, mascots and the status/score are
  drawn with the terminal `Raster`; on non-terminal surfaces the pane falls back
  to text and skips the mascot.
- **Fullscreen docks the pane** full-height (host behaviour); the compact,
  board-sized layout appears on the normal screen.
- **Auto seasonal theme is off by default.** The festival dates in
  `hooks/festivals.ts` are approximate and should be kept up to date.
- **Sound** uses macOS `afplay`; other platforms silently skip it.
- Scores, theme, and preferences persist across sessions.

## Development

```
claude plugin validate .      # manifest + hooks
claude plugin test .          # unit tests (engine, AI, themes, sprites, font)
tsc -p .                      # type-check (after the mod has loaded once)
```
