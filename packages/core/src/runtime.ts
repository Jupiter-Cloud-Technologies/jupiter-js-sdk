export type Runtime = 'browser' | 'node' | 'worker' | 'unknown'

export function getRuntime(): Runtime {
  const maybeGlobal = globalThis as typeof globalThis & {
    process?: {
      versions?: {
        node?: string
      }
    }
    WebSocketPair?: unknown
  }

  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'browser'
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser'
  }

  if (maybeGlobal.process?.versions?.node) {
    return 'node'
  }

  if (maybeGlobal.WebSocketPair !== undefined || typeof caches !== 'undefined') {
    return 'worker'
  }

  return 'unknown'
}
