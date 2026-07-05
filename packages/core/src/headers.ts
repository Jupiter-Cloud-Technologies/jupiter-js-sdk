import type { HeadersInitLike } from './types'

export function createHeaders(base?: HeadersInit, extra?: HeadersInitLike): Headers {
  const headers = new Headers(base)

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined) {
      headers.set(key, value)
    }
  }

  return headers
}

export function getRequestId(headers: Headers): string | undefined {
  return headers.get('x-request-id') ?? headers.get('x-jupiter-request-id') ?? undefined
}
