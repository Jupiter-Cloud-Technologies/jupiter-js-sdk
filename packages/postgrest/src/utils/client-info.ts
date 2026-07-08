import { VERSION } from '../version'

const CLIENT_INFO_HEADER = 'X-Client-Info'

export function injectClientInfo(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit)

  if (!headers.has(CLIENT_INFO_HEADER)) {
    headers.set(CLIENT_INFO_HEADER, `jupiter-postgrest-js/${VERSION}`)
  }

  return headers
}
