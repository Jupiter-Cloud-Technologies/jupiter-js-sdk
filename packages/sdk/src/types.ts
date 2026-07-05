import type { Fetch, JsonObject } from '@jupiter-cloud/core'

export type JupiterOptions = {
  authUrl?: string | undefined
  baseUrl: string
  claims?: JsonObject | string | undefined
  fetch?: Fetch | undefined
  headers?: HeadersInit | undefined
  projectId: string
  retryAttempts?: number | undefined
  storageUrl?: string | undefined
  timeoutMs?: number | undefined
  token?: string | undefined
}
