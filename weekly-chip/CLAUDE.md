# weekly-chip — mod memory

`7д N%` (the 7-day limit's used share) in the prompt footer on the desktop,
left of the model name. Grey < 60 % ≤ yellow < 85 % ≤ red (`#d99a1e`, `#d64545`,
the same thresholds and colors as usage-band; grey is `dimColor`).

## Facts

- Created 2026-11-16, version 0.1.0, desktop build 2.1.325.
- Site: `ui.render` on `SessionMode` (the dim mode labels of the prompt footer;
  raised on terminal and desktop). On the desktop `e.props.modes` was `[]`.
- **Rewriting `props.modes` draws nothing on the desktop**; returning an own
  tree `<Box row gap=1>{await next(e)}<Text>label</Text></Box>` draws. The
  desktop puts it left of `Opus 5.5 · effort · mode · ◯`; the order of that
  row is the app's, so the label cannot go right of the limits ring.
- Alignment: the Box wrapper with the empty engine row sat ~1–2 px below the
  footer's line. With `modes` empty the hook returns the bare `<Text>` — level
  with `Opus 5.5` (checked 2026-11-16). With labels present it keeps the row
  Box, `alignItems="center"` (unchecked: never seen non-empty on the desktop).
- The ring at the far right of that row is the plan-limits indicator (its
  popup: weekly, all models), not context.
- Data: `$.session.usage()` at `session.start`, then `session.measure`
  (`e.rateLimits`, kind `seven_day`). Kept in `$.state['weekly-chip'].weekly`.
- The engine's figure (from API responses of this session, "at most one
  decimal") can trail the ring's popup (claude.ai, all sessions) by ~1 %:
  seen 96 vs 97. Matching it would need an undocumented claude.ai endpoint
  with the user's credential — declined.

## Open

- Not checked in the terminal (SessionMode there sits right of the prompt footer).
