export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Usage = { contextPercent: number | null; limits: Limit[] }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { usage: Usage | null; now: number }
  }
}
