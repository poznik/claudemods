/** The weekly limit's used share, 0–100, or null before the first read. */
export type Weekly = number | null

declare module 'claude-code' {
  interface PluginState {
    'weekly-chip': {
      weekly: Weekly
    }
  }
}
