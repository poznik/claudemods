# claudemods

Моды для Claude desktop и Claude Code. Одна папка — один мод.

## Моды

| Мод | Что делает |
|---|---|
| [usage-band](usage-band/) | Полоса над полем ввода: таймер до сброса лимита, расход за 5 ч и 7 дн, заполнение контекста |
| [session-board](session-board/) | Панель рядом с чатом: работающие и непрочитанные сессии по всем проектам (прототип) |

## Установка

1. Склонируйте репозиторий:
   ```bash
   git clone https://github.com/poznik/claudemods.git
   ```
2. Добавьте папку мода в `~/.claude/settings.json`:
   ```json
   { "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\claudemods\\usage-band" } }
   ```
   Несколько модов в Windows разделяются `;`, в macOS/Linux — `:`.
3. Перезапустите Claude.
