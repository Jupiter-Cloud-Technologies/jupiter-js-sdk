import { JupiterStorage } from '@jupiter-cloud/storage'
import type { JupiterOptions } from './types'

const defaultStoragePath = '/storage'

export class Jupiter {
  storage: JupiterStorage

  private baseUrl: string
  private options: JupiterOptions

  constructor(baseUrl: string, options: JupiterOptions) {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.options = { ...options }
    this.storage = this.createStorage()
  }

  /**
   * Update the base API URL used by Jupiter service clients.
   *
   * Calling this rebuilds service clients so subsequent calls use the new URL.
   */
  setBaseUrl(baseUrl: string): this {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.options.storageUrl = undefined
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
    this.storage = this.createStorage()
    return this
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
