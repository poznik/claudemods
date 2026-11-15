import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'

const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const GREEN = '#3a9d77'
const YELLOW = '#d99a1e'
const RED = '#d64545'
const BLUE = '#3b5bdb'
const TRACK = '#8a8a8a40'
const TEXT_BAR = 10
const SVG_W = 56
const SVG_H = 6

const toUsage = (context: SessionContextUsage, rateLimits: SessionRateLimit[]): Usage => ({
  contextPercent: context.percent ?? null,
  limits: rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
})

const limitColor = (p: number) => (p >= 85 ? RED : p >= 60 ? YELLOW : GREEN)

const countdown = (resetsAt: string | undefined, nowMs: number) => {
  if (!resetsAt) return null
  const ms = Date.parse(resetsAt) - nowMs
  if (!Number.isFinite(ms)) return null
  const mins = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return d > 0 ? `${d} д ${hm}` : hm
}

async function save($: EngineInterface, u: Usage) {
  await update($, usage, () => u)
  const t = await $.clock.now()
  await update($, now, () => t)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    await save($, toUsage(u.context, u.rateLimits))
    $.clock.every(30_000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    await save($, toUsage(e.context, e.rateLimits))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const u = await read($, usage)
    if (e.props.hasSurvey || u === null) return next(e)

    const nowMs = await read($, now)
    const isTerminal = e.surface === 'terminal'
    const ui = $.ui.resolve(e) as any
    const { Box, Text } = ui

    const bar = (p: number, color: string) => {
      const clamped = Math.max(0, Math.min(100, p))
      if (!isTerminal && ui.Svg) {
        const w = clamped > 0 ? Math.max(SVG_H, (clamped / 100) * SVG_W) : 0
        const r = SVG_H / 2
        const source =
          `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">` +
          `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" rx="${r}" fill="${TRACK}"/>` +
          (w > 0 ? `<rect x="0" y="0" width="${w.toFixed(1)}" height="${SVG_H}" rx="${r}" fill="${color}"/>` : '') +
          `</svg>`
        return <ui.Svg source={source} alt={`${Math.round(clamped)}%`} width={SVG_W} height={SVG_H} />
      }
      const filled = Math.max(clamped > 0 ? 1 : 0, Math.min(TEXT_BAR, Math.round((clamped / 100) * TEXT_BAR)))
      return (
        <Text>
          <Text color={color}>{'█'.repeat(filled)}</Text>
          <Text color={TRACK}>{'░'.repeat(TEXT_BAR - filled)}</Text>
        </Text>
      )
    }

    const segment = (label: string, p: number, color: string, isAlarm: boolean) => (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text dimColor>{label}</Text>
        {bar(p, color)}
        <Text color={isAlarm ? RED : undefined} bold={isAlarm}>{`${Math.round(p)}%`}</Text>
      </Box>
    )

    const five = u.limits.find(l => l.kind === 'five_hour')
    const seven = u.limits.find(l => l.kind === 'seven_day')
    const resetSource = five ?? [...u.limits].filter(l => l.resetsAt).sort((a, b) => Date.parse(a.resetsAt!) - Date.parse(b.resetsAt!))[0]
    const reset = countdown(resetSource?.resetsAt, nowMs)

    const parts: unknown[] = []
    if (reset) {
      parts.push(
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text dimColor>↻ Сброс</Text>
          <Text bold>{reset}</Text>
        </Box>,
      )
    }
    if (five) parts.push(segment('5 ч', five.percentUsed, limitColor(five.percentUsed), five.percentUsed >= 85))
    if (seven) parts.push(segment('7 дн', seven.percentUsed, limitColor(seven.percentUsed), seven.percentUsed >= 85))
    parts.push(segment('Контекст', u.contextPercent ?? 0, BLUE, false))

    return (
      <Box flexDirection="row" flexWrap="wrap" alignItems="center">
        {parts.map((p, i) => (
          <Box key={`p${i}`} flexDirection="row" alignItems="center">
            {i > 0 && <Text dimColor> │ </Text>}
            {p}
          </Box>
        ))}
      </Box>
    )
  })
}
