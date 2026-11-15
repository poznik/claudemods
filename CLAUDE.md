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
