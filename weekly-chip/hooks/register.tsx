import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

const weekly = atom({ plugin: 'weekly-chip', key: 'weekly' } as const, null)

const YELLOW = '#d99a1e'
const RED = '#d64545'

const weeklyOf = (limits: readonly SessionRateLimit[]) => limits.find(l => l.kind === 'seven_day')?.percentUsed ?? null

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    const p = weeklyOf(u.rateLimits)
    await update($, weekly, () => p)
    return result
  })

  // Every response carries fresh rate-limit figures.
  on('session.measure', async ($, e, next) => {
    const p = weeklyOf(e.rateLimits)
    if (p !== (await read($, weekly))) await update($, weekly, () => p)
    return next(e)
  })

  // `7д 96%` beside the dim mode labels in the prompt footer: grey below 60 %, yellow below 85 %, red from 85 %.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const row = await next(e)
    const p = await read($, weekly)
    if (p === null) return row
    const { Box, Text } = $.ui.resolve(e)
    const label = `7д ${Math.round(p)}%`
    const chip =
      p >= 85 ? <Text color={RED}>{label}</Text> : p >= 60 ? <Text color={YELLOW}>{label}</Text> : <Text dimColor>{label}</Text>
    // No engine labels: the bare text, so no wrapper shifts it off the footer's line.
    if (e.props.modes.length === 0) return chip
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        {row}
        {chip}
      </Box>
    )
  })
}
