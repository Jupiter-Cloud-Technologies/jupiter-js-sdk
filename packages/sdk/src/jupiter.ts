import { JupiterAuth } from '@jupiter-cloud/auth'
import { JupiterStorage } from '@jupiter-cloud/storage'
import type { JupiterOptions } from './types'

const defaultAuthPath = '/auth'
const defaultStoragePath = '/storage'

export class Jupiter {
  auth: JupiterAuth
  storage: JupiterStorage

  private baseUrl: string
  private options: JupiterOptions

  constructor(options: JupiterOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.options = { ...options }
    this.auth = this.createAuth()
    this.storage = this.createStorage()
  }

  /**
   * Update the base API URL used by Jupiter service clients.
   *
   * Calling this rebuilds service clients so subsequent calls use the new URL.
   */
  setBaseUrl(baseUrl: string): this {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.options.baseUrl = this.baseUrl
    this.options.authUrl = undefined
    this.options.storageUrl = undefined
    this.auth = this.createAuth()
    this.storage = this.createStorage()
    return this
  }

  /**
   * Update the project identifier used by Jupiter service clients.
   *
   * Calling this rebuilds service clients so subsequent calls send the new
   * `X-Jupiter-Project-Id` header.
   */
  setProjectId(projectId: string): this {
    this.options.projectId = projectId
    this.auth = this.createAuth()
    this.storage = this.createStorage()
    return this
  }

  private createAuth(): JupiterAuth {
    const authUrl = this.options.authUrl ?? `${this.baseUrl}${defaultAuthPath}`
    const headers = normalizeHeaders(this.options.headers)

    return new JupiterAuth(authUrl, {
      fetch: this.options.fetch,
      ...(headers ? { headers } : {}),
      projectId: this.options.projectId
    })
  }

  private createStorage(): JupiterStorage {
    const storageUrl = this.options.storageUrl ?? `${this.baseUrl}${defaultStoragePath}`

    return new JupiterStorage(storageUrl, {
      fetch: this.options.fetch,
      headers: this.options.headers,
      projectId: this.options.projectId,
      retryAttempts: this.options.retryAttempts,
      timeoutMs: this.options.timeoutMs,
      token: this.options.token
    })
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function normalizeHeaders(headers: HeadersInit | undefined): { [key: string]: string } | undefined {
  if (!headers) {
    return undefined
  }

  return Object.fromEntries(new Headers(headers).entries())
}
