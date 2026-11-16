# claudemods — project memory

Mods for Claude desktop / Claude Code (UI and behaviour plugins built with the
`plugin-authoring` skill). Public repo: https://github.com/poznik/claudemods

## Layout

- One folder = one mod. The folder is a complete plugin
  (`.claude-plugin/plugin.json`, `hooks/`, `types/`, `tsconfig.json`).
- Each mod folder has its own `CLAUDE.md` — the memory for that mod
  (what it does, how it works, decisions, open issues).
- This file is the memory for the whole project.
- `.claude-plugin/types/` inside a mod is generated typings; it is gitignored.

## Memory rules

- Memory lives in this repo, not in `~/.claude/projects/.../memory`.
- Project-wide facts → this file. Mod-specific facts → `<mod>/CLAUDE.md`.
- Memory files are in English; `README.md` files are in Russian (the owner reads them).
- Update the mod's `CLAUDE.md` whenever the mod changes in a way worth remembering.

## Installation

Claude loads the mods from this checkout via `CLAUDE_CODE_PLUGIN_DIRS` in
`~/.claude/settings.json` (`env`). Several dirs are separated by `;` on Windows.
After adding a mod, append its folder there and restart Claude.

## Mods

| Mod | What | Since |
|---|---|---|
| [usage-band](usage-band/) | Band above the prompt: reset countdown, 5h/7d usage, context fill | 2026-11-14 |
| [session-board](session-board/) | Pane beside the chat: running / finished-unread sessions across projects. Prototype, **not installed** | 2026-11-15 |
| [message-time](message-time/) | `HH:MM` above each user message and assistant text block in the transcript | 2026-11-16 |

## What a mod cannot do (checked 2026-11-15, build 2.1.325)

- No DOM/CSS access: a mod draws only at the engine's hook sites (transcript
  rows, band above the prompt, panes, status line, theme colors and backdrop).
  The app's left sidebar, tabs, settings and windows are out of reach — no
  fonts, icons or layout there.
- In auto mode, app tools that change state (`ccd_sidebar.*` writes) are refused
  when called from plugin code; read tools (`list_sessions`, `list_sections`)
  work. Details in [session-board/CLAUDE.md](session-board/CLAUDE.md).
- A mod lives inside a session. To show something in every session it must be
  loaded in every session.
- Transcript message render props (`UserMessage`, `AssistantMessage`) carry no
  timestamp; their `e.requestId` maps to the transcript JSONL (details in
  [message-time/CLAUDE.md](message-time/CLAUDE.md)).

## Developing a mod

Write and hot-reload it under `~/.claude/dev-mods/<session id>/<mod>/` (the
`plugin-authoring` skill sets this up), then copy the finished folder here.
The Bash heredoc breaks on TSX with quotes — write mod files with the Write tool.
