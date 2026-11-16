# message-time — mod memory

A dim `HH:MM` line above every user message and every assistant text block in
the transcript (desktop and CLI). Another day's message reads `DD.MM HH:MM`.

## Facts

- Created 2026-11-16, version 0.1.0, built and checked on desktop build 2.1.325.
- Hooks `ui.render` on `UserMessage` and `AssistantMessage`, returns
  `<Box column><Box row justifyContent=flex-end><Text dim size=caption>time</Text></Box>{await next(e)}</Box>`:
  right-aligned, smallest text size (`caption`; the terminal has one size).
- Render props carry no timestamp. The time comes from two places:
  1. **History**: the session transcript JSONL, read at `classic.SessionStart`
     (and `classic.UserPromptSubmit` when the path changed), and again at
     `session.start` on a hot reload from the path kept in `$.state.transcript`.
     Parsed into `$.state.history` (id → epoch ms).
  2. **New messages**: a module-level `firstSeen` map, stamped at the first
     render after history has loaded. Lost on reload; the reload's re-read of
     the file covers it.
- **Render ids** (verified on desktop 2026-11-16):
  - `UserMessage` `e.requestId` = the transcript row's `uuid`.
  - `AssistantMessage` `e.requestId` = `<API message id>-t<n>`
    (`msg_011C...-t0`), n = index among the text blocks of that API message.
    Each block is its own JSONL row sharing `message.id`.
- Only user rows with text (string or a text block) and assistant text blocks
  go into history; tool results and `isMeta` rows are skipped.
- `$.fs.read` caps at 4 MiB; over that, the file is streamed through
  `cmd /d /c type` (Windows) or `cat`. The fallback is untested.
- Time zone: `Date` inside the mod uses the host's local zone (checked against
  the system clock).
- On the desktop, `isFirstOfReply` is true only on the first block of a whole
  turn, so stamping only first blocks would give one time per turn. Every text
  block is stamped instead.
- Renders before history loads draw no stamp; the `history` write redraws them.

## Open

- Over-4-MiB fallback not exercised.
- Not checked in the terminal surface.
