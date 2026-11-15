import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Board, Group, Row } from '../types'

const PANE = 'session-board'
const POLL_MS = 5000
const RECENT = 5
const GREEN = '#3a9d77'
const BLUE = '#3b82f6'
const RED = '#d64545'

const board = atom({ plugin: 'session-board', key: 'board' } as const, null, { shape: 'board-1' })

// What this session tells the others: is the person looking at it, when they
// last were, and when its last turn ended. One JSON file per session.
type Mark = { id: string; attached: boolean; seenAt: number; doneAt: number }

type Listed = {
  sessionId: string
  title?: string
  cwd?: string
  isRunning?: boolean
  lastActivityAt?: string
  link?: string
  startedBy?: string
}

let me: Mark | null = null
let dir = ''
let lastJson = ''
let isBusy = false
const clients = new Set<string>()

const folderOf = (cwd: string | undefined) => {
  const parts = (cwd ?? '').split(/[\\/]/).filter(Boolean)
  const wt = parts.indexOf('.claude')
  const name = wt > 0 ? parts[wt - 1] : parts[parts.length - 1]
  return name ?? ''
}

async function saveMark($: EngineInterface) {
  if (me) await $.fs.write(`${dir}/${me.id}.json`, JSON.stringify(me))
}

async function readMark($: EngineInterface, path: string): Promise<Mark | null> {
  try {
    const m = JSON.parse(String(await $.fs.read(path))) as Mark
    return typeof m.id === 'string' ? m : null
  } catch {
    return null
  }
}

async function init($: EngineInterface) {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.'
  dir = `${home.replace(/\\/g, '/')}/.claude/session-board`
  const id = (await $.env.get('CLAUDE_CODE_HOST_SESSION_ID')) ?? `cc_${await $.session.id()}`
  const now = await $.clock.now()
  const prev = await readMark($, `${dir}/${id}.json`)
  clients.clear()
  me = { id, attached: false, seenAt: prev?.seenAt ?? now, doneAt: prev?.doneAt ?? 0 }
  await saveMark($)
}

async function loadMarks($: EngineInterface) {
  const marks = new Map<string, Mark>()
  const entries = await $.fs.list(dir)
  for (const entry of entries) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue
    const m = await readMark($, `${dir}/${entry.name}`)
    if (m) marks.set(m.id, m)
  }
  return marks
}

async function build($: EngineInterface): Promise<Board> {
  const r = await $.mcp.call('ccd_session_mgmt', 'list_sessions', { limit: 50 })
  const text = (r.content.find(b => b.type === 'text') as { text?: string } | undefined)?.text ?? '[]'
  if (r.isError) throw new Error(text.slice(0, 200))
  const listed = JSON.parse(text) as Listed[]
  const marks = await loadMarks($)

  const rows: Row[] = []
  let recent = 0
  for (const s of listed) {
    const m = marks.get(s.sessionId)
    const isUnread = m !== undefined && !m.attached && m.doneAt > m.seenAt
    let group: Group
    if (s.isRunning) group = 'running'
    else if (isUnread) group = 'unread'
    else if (recent++ < RECENT) group = 'recent'
    else continue
    rows.push({
      id: s.sessionId,
      title: s.title ?? s.sessionId,
      folder: folderOf(s.cwd),
      link: s.link ?? '',
      group,
      isChild: s.startedBy !== undefined,
    })
  }
  return { rows, error: null }
}

async function refresh($: EngineInterface) {
  if (isBusy) return
  isBusy = true
  let next: Board
  try {
    next = await build($)
  } catch (err) {
    next = { rows: [], error: String(err).slice(0, 300) }
  }
  isBusy = false

  const json = JSON.stringify(next)
  if (json === lastJson) return
  lastJson = json
  await update($, board, () => next)
}

async function open($: EngineInterface, link: string) {
  if (!link.startsWith('claude://')) return
  try {
    await $.process.run(['rundll32', 'url.dll,FileProtocolHandler', link])
  } catch (err) {
    $.ui.toast(`Не удалось открыть сессию: ${String(err).slice(0, 120)}`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    try {
      await init($)
    } catch (err) {
      $.ui.toast(`session-board: ${String(err).slice(0, 160)}`)
    }
    await $.command.register({ name: 'board', description: 'Показать панель активных сессий' })
    void $.ui.open({ id: PANE, title: 'Сессии' })
    lastJson = ''
    await refresh($)
    $.clock.every(POLL_MS, () => {
      void refresh($)
    })
    return result
  })

  on('command.run', { command: 'board' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Сессии' })
    return { text: 'Панель сессий открыта.' }
  })

  on('session.attach', async ($, e, next) => {
    if (e.surface === 'desktop' && me) {
      clients.add(e.clientId)
      me.attached = true
      me.seenAt = await $.clock.now()
      await saveMark($).catch(() => {})
    }
    return next(e)
  })

  on('session.detach', async ($, e, next) => {
    if (e.surface === 'desktop' && me) {
      clients.delete(e.clientId)
      me.attached = clients.size > 0
      me.seenAt = await $.clock.now()
      await saveMark($).catch(() => {})
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && me) {
      me.doneAt = await $.clock.now()
      if (me.attached) me.seenAt = me.doneAt
      await saveMark($).catch(() => {})
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, board)
    const rows = b?.rows ?? []
    const running = rows.filter(r => r.group === 'running')
    const unread = rows.filter(r => r.group === 'unread')
    const recent = rows.filter(r => r.group === 'recent')

    if (e.props.placement === 'widget') {
      return (
        <Box flexDirection="row" gap={2}>
          <Text color={GREEN}>⟳ {running.length}</Text>
          <Text color={BLUE}>● {unread.length}</Text>
        </Box>
      )
    }

    const cols = e.props.bodyColumns ?? e.viewport?.columns ?? 40
    const line = (r: Row, glyph: string, color: string | undefined) => {
      const room = Math.max(16, cols - r.folder.length - 6)
      const title = r.title.length > room ? `${r.title.slice(0, room - 1)}…` : r.title
      return (
        <Button key={r.id} plain onPress={() => void open($, r.link)}>
          <Text color={color} dimColor={color === undefined}>{glyph}</Text>
          {` ${r.isChild ? '↳ ' : ''}${title} `}
          <Text dimColor>{r.folder}</Text>
        </Button>
      )
    }
    const section = (title: string, list: Row[], glyph: string, color: string | undefined, empty: string) => (
      <Box flexDirection="column">
        <Text bold>{list.length > 0 ? `${title} · ${list.length}` : title}</Text>
        {list.length === 0 && <Text dimColor>{empty}</Text>}
        {list.map(r => line(r, glyph, color))}
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        {b === null && <Text dimColor>Загрузка…</Text>}
        {b?.error && <Text color={RED}>{`Ошибка: ${b.error}`}</Text>}
        {section('Работают', running, '⟳', GREEN, 'никто не работает')}
        {section('Ждут прочтения', unread, '●', BLUE, 'всё прочитано')}
        {section('Недавние', recent, '○', undefined, 'нет')}
      </Box>
    )
  })
}
