/**
 * Epoch milliseconds of a transcript message, keyed by the id its row's
 * `ui.render` reads as `e.requestId`: the row's uuid for a user message,
 * `<API message id>-t<n>` for the n-th text block of an assistant message.
 */
export type Stamps = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'message-time': {
      /** Messages read from the transcript file. */
      history: Stamps
      /** The session's transcript file, kept so a reload can read it again. */
      transcript: string | null
    }
  }
}
