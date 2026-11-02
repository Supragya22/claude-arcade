# Claude Arcade

A tiny arcade that lives in a Claude Code pane, so you can play **Tic-Tac-Toe,
Snake or Space Invaders while Claude works**. Games stay interactive during
active tasks — input registers and the pane redraws mid-turn — without using any
Claude tokens (everything runs locally). It coexists with other mods and keeps to
its own pane.

## Install

At a terminal Claude Code prompt:

```
/plugin install arcade --marketplace Supragya22/claude-arcade
```

(Press `y` to add the marketplace, then pick a scope. From a shell, use
`claude plugin install arcade --marketplace Supragya22/claude-arcade`.)

## Play

**Tic-Tac-Toe** (`/arcade` or `/arcade ttt`)
- Click any cell to place your **X**; the AI plays **O**.
- The AI is near-perfect minimax but **slips occasionally**, so you can win now
  and then; play well and most games draw.
- Mouse: click a cell, New Game, Theme, or Close.

**Snake** (`/arcade snake`)
- Click the board, then steer with **arrow keys** or **WASD** — even while Claude
  works. `P` pauses, `N` starts a new game.
- Eat the food to grow and score; the pace quickens as you go. Best score
  persists across sessions.
- Its own fixed retro look (neon-on-dark), separate from the TTT themes.

**Space Invaders** (`/arcade invaders`)
- Click the board, then **← →** / **A D** to move and **Space** to fire. `P`
  pauses, `N` starts a new game.
- Shoot the descending formation before it lands; hide behind **destructible
  shields**; a pink **UFO** drifts across the top for a bonus. Clear a wave for the
  next, faster one. Three lives, best score persists.
- Explosions on hits, distinct sounds, and its own fixed retro sci-fi look.
- Minimise `[-]` pauses and keeps the game; closing with `×` resets it.

## Commands

| Command | What it does |
| --- | --- |
| `/arcade` | Open the pane |
| `/arcade ttt` | Switch the pane to Tic-Tac-Toe |
| `/arcade snake` | Switch the pane to Snake |
| `/arcade invaders` | Switch the pane to Space Invaders |
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
- **Snake and Space Invaders are terminal-only and keyboard-first.** Click the
  board once to give it keyboard focus (so it never steals keys from a prompt or
  question dialog); `Esc` releases focus — the pane closes via the × only.
- **Space Invaders movement is per-keypress** (the terminal sends no key-release),
  so holding a direction relies on the terminal's key-repeat; rapid taps nudge
  faster. It uses block-character sprites (the keyboard surface has no `Raster`).
- Scores, best scores, theme, and preferences persist across sessions.

## Development

```
claude plugin validate .      # manifest + hooks
claude plugin test .          # unit tests (TTT, themes, sprites, font, Snake, Space Invaders engine/input)
tsc -p .                      # type-check (after the mod has loaded once)
```
