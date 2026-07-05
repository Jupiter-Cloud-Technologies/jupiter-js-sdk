import type { JupiterErrorPayload } from './types'

export class JupiterError<TCode extends string = string> extends Error {
  readonly code: TCode
  readonly detail: string
  readonly requestId: string | undefined
  readonly status: number
  readonly title: string
  readonly type: string

  constructor(payload: JupiterErrorPayload<TCode>) {
    super(payload.detail)
    this.name = 'JupiterError'
    this.code = payload.code
    this.detail = payload.detail
    this.requestId = payload.requestId
    this.status = payload.status
    this.title = payload.title
    this.type = payload.type
  }
}

export class JupiterNetworkError extends Error {
  override readonly cause: unknown

  constructor(cause: unknown) {
    super('Network request failed')
    this.name = 'JupiterNetworkError'
    this.cause = cause
  }
}

export function isJupiterError(value: unknown): value is JupiterError {
  return value instanceof JupiterError
}
