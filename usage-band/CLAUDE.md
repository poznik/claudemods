# usage-band — mod memory

Band above the prompt input (`AbovePrompt` slot) in Claude desktop and the CLI:
limit reset countdown, 5h and 7d usage bars, context fill. UI strings are Russian.

## Facts

- Created 2026-11-14, version 0.1.0. Moved into this repo 2026-11-15
  (was `~/.claude/mods/usage-band`).
- Data: `session.start` reads `$.session.usage()`; `session.measure` refreshes it;
  a 30 s `$.clock.every` tick refreshes the countdown. State lives in two atoms
  (`usage`, `now`) typed in `types/index.d.ts`.
- Rendering: on the desktop surface bars are inline SVG via `ui.Svg`; in the
  terminal they fall back to `█░` text bars (10 cells).
- Colors: limits green < 60 % ≤ yellow < 85 % ≤ red; context is always blue.
  At ≥ 85 % the percentage turns red and bold.
- Countdown source: the 5h limit, else the nearest `resetsAt` among limits.
  Format `HH:MM`, or `N д HH:MM` past a day.
- The band hides when `e.props.hasSurvey` is set or before the first usage read.

## Open

- Nothing known broken.
