import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Stamps } from '../types'

const history = atom({ plugin: 'message-time', key: 'history' } as const, {})
const transcript = atom({ plugin: 'message-time', key: 'transcript' } as const, null)

// Messages that arrived after the transcript was read: first drawn = sent or received.
// A module variable: a reload loses it, and the reload's own read of the file covers it.
const firstSeen = new Map<string, number>()
let isLoaded = false

const pad = (n: number) => String(n).padStart(2, '0')

// Same day: `14:32`; another day: `15.11 14:32`.
const formatTime = (ms: number, nowMs: number) => {
  const d = new Date(ms)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.toDateString() === new Date(nowMs).toDateString() ? hm : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${hm}`
}

type Row = {
  type?: string
  uuid?: string
  timestamp?: string
  isMeta?: boolean
  message?: { id?: string; content?: unknown }
}

type Block = { type?: string }

// Reads every message's time from the transcript file, keyed as the rows' `ui.render` sees them.
async function loadHistory($: EngineInterface, path: string) {
  const stamps: Stamps = {}
  const textBlocks = new Map<string, number>() // API message id → text blocks met so far

  const take = (line: string) => {
    if (!line.includes('"uuid"') || !(line.includes('"type":"user"') || line.includes('"type":"assistant"'))) return
    let row: Row
    try {
      row = JSON.parse(line)
    } catch {
      return
    }
    if (!row.uuid || !row.timestamp || row.isMeta) return
    const ms = Date.parse(row.timestamp)
    if (!Number.isFinite(ms)) return
    const content = row.message?.content
    if (row.type === 'user') {
      // A prompt (text) or one with images beside it; tool results draw elsewhere.
      if (typeof content === 'string' || (Array.isArray(content) && content.some((b: Block) => b?.type === 'text')))
        stamps[row.uuid] = ms
    } else if (row.type === 'assistant' && row.message?.id && Array.isArray(content)) {
      // Each block of a reply is its own row; the screen names a text block `<message id>-t<n>`.
      const id = row.message.id
      for (const b of content as Block[]) {
        if (b?.type !== 'text') continue
        const n = textBlocks.get(id) ?? 0
        stamps[`${id}-t${n}`] = ms
        textBlocks.set(id, n + 1)
      }
    }
  }

  if (await $.fs.exists(path)) {
    let text: string | null = null
    try {
      text = await $.fs.read(path)
    } catch {
      text = null
    }
    if (text !== null) {
      for (const line of text.split('\n')) take(line)
    } else {
      // Over the 4 MiB read limit: stream the file through a child process instead.
      const argv = /^[A-Za-z]:[\\/]/.test(path) ? ['cmd', '/d', '/c', 'type', path] : ['cat', path]
      let rest = ''
      for await (const piece of $.process.spawn({ argv })) {
        if (!('text' in piece) || piece.stream !== 'stdout') continue
        const lines = (rest + piece.text).split('\n')
        rest = lines.pop() ?? ''
        for (const line of lines) take(line)
      }
      take(rest)
    }
  }
  isLoaded = true
  await update($, history, () => stamps)
}

async function remember($: EngineInterface, path: string | undefined) {
  if (!path) return
  if ((await read($, transcript)) !== path) await update($, transcript, () => path)
  await loadHistory($, path)
}

// The message's time, or 0 while the transcript is still being read.
async function stampOf($: EngineInterface, requestId: string) {
  const stamps = await read($, history)
  const known = stamps[requestId] ?? firstSeen.get(requestId)
  if (known) return known
  if (!isLoaded) return 0
  const now = await $.clock.now()
  firstSeen.set(requestId, now)
  return now
}

export const register: Register = on => {
  // A reload: the path is already known, read the file again.
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const path = await read($, transcript)
    if (path) void loadHistory($, path).catch(() => undefined)
    return result
  })

  // The transcript's path rides the classic hook inputs; either will do.
  on('classic.SessionStart', async ($, e, next) => {
    void remember($, e.transcript_path).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))
  on('classic.UserPromptSubmit', async ($, e, next) => {
    if ((await read($, transcript)) !== e.transcript_path) void remember($, e.transcript_path).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const ms = await stampOf($, e.requestId)
    if (!ms) return row
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="flex-end">
          <Text dimColor size="caption">{formatTime(ms, await $.clock.now())}</Text>
        </Box>
        {row}
      </Box>
    )
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const row = await next(e)
    const ms = await stampOf($, e.requestId)
    if (!ms) return row
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="flex-end">
          <Text dimColor size="caption">{formatTime(ms, await $.clock.now())}</Text>
        </Box>
        {row}
      </Box>
    )
  })
}
