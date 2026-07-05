import { JupiterError } from './errors'
import { resolveFetch } from './fetch'
import { createHeaders, getRequestId } from './headers'
import { getRetryDelayMs, shouldRetry, type RetryOptions } from './retry'
import type {
  Fetch,
  HeadersInitLike,
  JsonValue,
  JupiterClientErrorPayload,
  JupiterErrorPayload,
  JupiterResult
} from './types'

export type HttpClientOptions = {
  fetch?: Fetch | undefined
  headers?: HeadersInit | undefined
  retry?: RetryOptions | undefined
  timeoutMs?: number | undefined
}

export type RequestOptions = {
  body?: BodyInit | JsonValue | undefined
  headers?: HeadersInitLike | undefined
  method?: string | undefined
  query?: Record<string, string | number | boolean | null | undefined> | undefined
  signal?: AbortSignal | undefined
}

export class HttpClient {
  readonly baseUrl: string
  readonly headers: HeadersInit | undefined
  readonly retry: Required<Pick<RetryOptions, 'attempts'>>
  readonly timeoutMs: number | undefined

  private readonly fetcher: Fetch

  constructor(baseUrl: string, options: HttpClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.fetcher = resolveFetch(options.fetch)
    this.headers = options.headers
    this.retry = {
      attempts: options.retry?.attempts ?? 1
    }
    this.timeoutMs = options.timeoutMs
  }

  async request<TData, TError extends JupiterErrorPayload = JupiterErrorPayload>(
    path: string,
    options: RequestOptions = {}
  ): Promise<JupiterResult<TData, TError>> {
    const url = this.createUrl(path, options.query)
    const headers = createHeaders(this.headers, options.headers)
    const baseInit = this.createRequestInit(options, headers)
    const attempts = Math.max(1, this.retry.attempts)

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const requestSignal = createRequestSignal(options.signal, this.timeoutMs)
      const init = withRequestSignal(baseInit, requestSignal.signal)

      try {
        const response = await this.fetcher(url, init)

        if (response.ok) {
          try {
            return {
              data: await parseResponseBody<TData>(response),
              error: null,
              response
            }
          } catch (error) {
            return {
              data: null,
              error: createInvalidResponsePayload(response, error),
              response
            }
          }
        }

        if (attempt < attempts && shouldRetry(response.status)) {
          await delay(getRetryDelayMs(attempt))
          continue
        }

        return {
          data: null,
          error: await parseError<TError>(response),
          response
        }
      } catch (error) {
        const errorPayload = requestSignal.didTimeout()
          ? createTimeoutErrorPayload(this.timeoutMs)
          : createNetworkErrorPayload(error)

        if (errorPayload.code !== 'jupiter.abort_error' && attempt < attempts) {
          await delay(getRetryDelayMs(attempt))
          continue
        }

        return {
          data: null,
          error: errorPayload,
          response: createSyntheticErrorResponse(errorPayload)
        }
      } finally {
        requestSignal.cleanup()
      }
    }

    throw new Error('Unreachable retry state')
  }

  async requestOrThrow<TData, TError extends JupiterErrorPayload = JupiterErrorPayload>(
    path: string,
    options: RequestOptions = {}
  ): Promise<TData> {
    const result = await this.request<TData, TError>(path, options)

    if (result.error === null) {
      return result.data as TData
    }

    throw new JupiterError(result.error)
  }

  private createUrl(
    path: string,
    query?: Record<string, string | number | boolean | null | undefined>
  ): string {
    const url = new URL(path.replace(/^\/+/, ''), `${this.baseUrl}/`)

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  private createRequestInit(options: RequestOptions, headers: Headers): RequestInit {
    const body = serializeBody(options.body, headers)
    const init: RequestInit = {
      headers,
      method: options.method ?? (body ? 'POST' : 'GET')
    }

    if (body !== undefined) {
      init.body = body
    }

    if (options.signal !== undefined) {
      init.signal = options.signal
    }

    return init
  }
}

async function parseResponseBody<TData>(response: Response): Promise<TData> {
  if (response.status === 204) {
    return undefined as TData
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (isJsonContentType(contentType)) {
    return (await response.json()) as TData
  }

  if (contentType.startsWith('text/')) {
    return (await response.text()) as TData
  }

  return (await response.blob()) as TData
}

async function parseError<TError extends JupiterErrorPayload>(
  response: Response
): Promise<TError | JupiterClientErrorPayload> {
  const requestId = getRequestId(response.headers)
  const payload = await readErrorJson(response.clone())

  if (isProblemDetailsLike(payload)) {
    return createProblemDetails<TError>(payload, response, requestId)
  }

  return createHttpErrorPayload(response, requestId, await readErrorText(response))
}

async function readErrorJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!isJsonContentType(contentType)) {
    return undefined
  }

  try {
    return await response.json()
  } catch {
    return undefined
  }
}

async function readErrorText(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text()
    return text.length > 0 ? text : undefined
  } catch {
    return undefined
  }
}

function createProblemDetails<TError extends JupiterErrorPayload>(
  payload: Record<string, unknown>,
  response: Response,
  requestId: string | undefined
): TError {
  return {
    code: payload.code,
    detail: stringOr(payload.detail, response.statusText),
    requestId: stringOrUndefined(payload.requestId) ?? requestId,
    status: numberOr(payload.status, response.status),
    title: stringOr(payload.title, response.statusText),
    type: stringOr(payload.type, 'about:blank')
  } as TError
}

function createHttpErrorPayload(
  response: Response,
  requestId: string | undefined,
  detail: string | undefined
): JupiterClientErrorPayload {
  return {
    code: 'jupiter.http_error',
    detail: detail ?? response.statusText,
    requestId,
    status: response.status,
    title: response.statusText,
    type: 'about:blank'
  }
}

function createInvalidResponsePayload(
  response: Response,
  error: unknown
): JupiterClientErrorPayload {
  return {
    code: 'jupiter.invalid_response',
    detail: getErrorMessage(error) ?? 'Response body could not be parsed.',
    status: response.status,
    title: 'Invalid response',
    type: 'about:blank'
  }
}

function createTimeoutErrorPayload(timeoutMs: number | undefined): JupiterClientErrorPayload {
  return {
    code: 'jupiter.timeout_error',
    detail:
      timeoutMs === undefined
        ? 'Request timed out.'
        : `Request timed out after ${timeoutMs} milliseconds.`,
    status: 408,
    title: 'Request timed out',
    type: 'about:blank'
  }
}

function createNetworkErrorPayload(error: unknown): JupiterClientErrorPayload {
  if (isAbortError(error)) {
    return {
      code: 'jupiter.abort_error',
      detail: getErrorMessage(error) ?? 'The request was aborted.',
      status: 499,
      title: 'Request aborted',
      type: 'about:blank'
    }
  }

  return {
    code: 'jupiter.network_error',
    detail: getErrorMessage(error) ?? 'Network request failed.',
    status: 503,
    title: 'Network request failed',
    type: 'about:blank'
  }
}

function createSyntheticErrorResponse(payload: JupiterClientErrorPayload): Response {
  return Response.json(payload, {
    headers: {
      'content-type': 'application/problem+json'
    },
    status: payload.status
  })
}

function isProblemDetailsLike(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.code === 'string'
}

function isJsonContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase()
  return normalized.includes('application/json') || normalized.includes('+json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}

type RequestSignal = {
  cleanup: () => void
  didTimeout: () => boolean
  signal: AbortSignal | undefined
}

function createRequestSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined
): RequestSignal {
  if (timeoutMs === undefined || timeoutMs <= 0) {
    return {
      cleanup: noop,
      didTimeout: () => false,
      signal
    }
  }

  const controller = new AbortController()
  let didTimeout = false

  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  const abortFromParentSignal = (): void => {
    controller.abort(signal?.reason)
  }

  if (signal?.aborted === true) {
    abortFromParentSignal()
  } else {
    signal?.addEventListener('abort', abortFromParentSignal, {
      once: true
    })
  }

  return {
    cleanup: () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortFromParentSignal)
    },
    didTimeout: () => didTimeout,
    signal: controller.signal
  }
}

function withRequestSignal(init: RequestInit, signal: AbortSignal | undefined): RequestInit {
  if (signal === undefined) {
    return init
  }

  return {
    ...init,
    signal
  }
}

function noop(): void {}

function serializeBody(body: RequestOptions['body'], headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined
  }

  if (isBodyInit(body)) {
    return body
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return JSON.stringify(body)
}

function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream ||
    body instanceof DataView
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
