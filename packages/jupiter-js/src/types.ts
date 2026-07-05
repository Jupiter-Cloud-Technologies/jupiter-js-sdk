import type { Fetch } from '@jupiter-cloud/core'

export type JupiterClientOptions = {
  fetch?: Fetch | undefined
  headers?: HeadersInit | undefined
  projectId: string
  retryAttempts?: number | undefined
  storageUrl?: string | undefined
  timeoutMs?: number | undefined
  token?: string | undefined
}
