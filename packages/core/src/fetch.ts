import type { Fetch } from './types'

export function resolveFetch(fetcher?: Fetch): Fetch {
  if (fetcher) {
    return fetcher
  }

  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis)
  }

  throw new Error('A fetch implementation is required in this runtime')
}
