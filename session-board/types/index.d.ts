export type Group = 'running' | 'unread' | 'recent'
export type Row = { id: string; title: string; folder: string; link: string; group: Group; isChild: boolean }
export type Board = { rows: Row[]; error: string | null }

declare module 'claude-code' {
  interface PluginState {
    'session-board': { board: Shaped<Board | null> }
  }
}
