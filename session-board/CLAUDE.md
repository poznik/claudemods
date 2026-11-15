# session-board — mod memory

Pane beside the chat ("Сессии") listing sessions across all projects: running,
finished-unread, and the five most recent others. Click a row to open that
session. UI strings are Russian.

**Status: prototype, saved 2026-11-15. Not installed** — it is not in
`CLAUDE_CODE_PLUGIN_DIRS`; the owner asked to only save it for now.

## Why it exists

The owner runs several sessions in parallel across projects, keeps the sidebar
grouped by folder (the only grouping that suits them), and pinned/unpinned
sessions by hand to keep track of active ones. Goal: see "running" and
"finished, result not read yet" without pinning.

## How it works

- Session list: `$.mcp.call('ccd_session_mgmt', 'list_sessions', { limit: 50 })`
  every 5 s. Read-only app tools work from plugin code with no prompt. The list
  excludes the current session.
- Own id: env `CLAUDE_CODE_HOST_SESSION_ID` (`local_<uuid>`, the desktop id that
  `list_sessions` uses). `$.session.id()` is a different, Claude Code id.
- Unread: each session writes its own mark file
  `~/.claude/session-board/<id>.json` = `{ id, attached, seenAt, doneAt }`.
  `session.attach` / `session.detach` (surface `desktop`) fire when the owner
  opens / leaves the session; `turn.complete` (main loop only) sets `doneAt`.
  A session is unread when `!attached && doneAt > seenAt`. So unread only works
  for sessions that have the mod loaded.
- Open on click: `$.process.run(['rundll32', 'url.dll,FileProtocolHandler', link])`
  with the `claude://…` link from `list_sessions`. Windows only.
- Minimized pane (`placement === 'widget'`) draws `⟳ N  ● N`.
- `/board` reopens the pane; it also opens at `session.start`.

## Findings from the probe (2026-11-15, build 2.1.325, auto mode)

- Tools that **change** the sidebar (`ccd_sidebar.set_unread`, so also
  `move_sessions`) are refused from plugin code: "in auto mode Claude Desktop
  doesn't run this tool when a plugin's own code calls it. Have Claude make the
  call." Not tested in other permission modes. This killed the first design
  (auto-filing sessions into a sidebar section).
- A `Link` with a `claude://` href is not clickable on desktop (only `https:`).
- `$.fs.write` outside the working directory works.
- The owner rejected a band above the prompt for this purpose.

## Open

- Owner has not confirmed that a row click opens the right session, nor the
  widget look. The log showed the session detaching 0.7 s after a button press,
  which suggests the click works.
- Stale mark files of archived/deleted sessions are never cleaned up.
- Undecided: show child sessions (started by another session) or only top-level;
  open the pane automatically or only by `/board`; a manual "watch" toggle.
- To install: add the folder to `CLAUDE_CODE_PLUGIN_DIRS` (`;`-separated) and
  restart Claude desktop.
