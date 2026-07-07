import type {
  AccessTokenResponse,
  AuthResponse,
  AuthResponsePassword,
  PublicUser,
  WeakPassword
} from '../types'
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
  AuthWeakPasswordError
} from './errors'
import { looksLikeFetchResponse } from './helpers'

export type Fetch = typeof fetch

export interface FetchOptions {
  headers?: {
    [key: string]: string
  }
  noResolveJson?: boolean
}

export interface FetchParameters {
  signal?: AbortSignal
}

const _getRequestParams = (
  method: RequestMethodType,
  options?: FetchOptions,
  parameters?: FetchParameters,
  body?: object
) => {
  const params: { [k: string]: any } = { method, headers: options?.headers || {} }

  if (method === 'GET') {
    return params
  }

  params.headers = { 'Content-Type': 'application/json;charset=UTF-8', ...options?.headers }
  params.body = JSON.stringify(body)
  return { ...params, ...parameters }
}

export type RequestMethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface AuthRequestOptions extends FetchOptions {
  jwt?: string
  redirectTo?: string
  body?: object
  query?: { [key: string]: string }
  /**
   * Function that transforms api response from gotrue into a desirable / standardised format
   */
  xform?: (data: any) => any
}

export async function _request(
  fetcher: Fetch,
  method: RequestMethodType,
  url: string,
  options?: AuthRequestOptions
) {
  const headers = {
    ...options?.headers
  }

  if (options?.jwt) {
    headers['Authorization'] = `Bearer ${options.jwt}`
  }

  const qs = options?.query ?? {}
  if (options?.redirectTo) {
    qs['redirect_to'] = options.redirectTo
  }

  const queryString = Object.keys(qs).length ? '?' + new URLSearchParams(qs).toString() : ''
  const data = await _handleRequest(
    fetcher,
    method,
    url + queryString,
    {
      headers,
      ...(options?.noResolveJson === undefined ? {} : { noResolveJson: options.noResolveJson })
    },
    {},
    options?.body
  )
  return options?.xform ? options?.xform(data) : { data: { ...data }, error: null }
}

const _getErrorMessage = (err: unknown): string => {
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    if (typeof e.msg === 'string') return e.msg
    if (typeof e.message === 'string') return e.message
    if (typeof e.error_description === 'string') return e.error_description
    if (typeof e.error === 'string') return e.error
  }
  return JSON.stringify(err)
}

// 500, 501, 502, 503, 504: Standard server/gateway errors
// 520-529, 530: Cloudflare-specific error codes (web server down, connection timed out, etc.)
// These are infrastructure errors and should not cause session invalidation.
const NETWORK_ERROR_CODES = [
  500, 501, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530
]

export async function handleError(error: unknown) {
  if (!looksLikeFetchResponse(error)) {
    throw new AuthRetryableFetchError(_getErrorMessage(error), 0)
  }

  if (NETWORK_ERROR_CODES.includes(error.status)) {
    // status in 500...599 range - server had an error, request might be retryed.
    throw new AuthRetryableFetchError(_getErrorMessage(error), error.status)
  }

  let data: any
  try {
    data = await error.json()
  } catch (e) {
    throw new AuthUnknownError(_getErrorMessage(e), e)
  }

  let errorCode: string | undefined = undefined
  errorCode = data.code ?? data.error_code

  if (errorCode === 'weak_password') {
    throw new AuthWeakPasswordError(
      _getErrorMessage(data),
      error.status,
      data.weak_password?.reasons || []
    )
  } else if (errorCode === 'session_not_found') {
    // The `session_id` inside the JWT does not correspond to a row in the
    // `sessions` table. This usually means the user has signed out, has been
    // deleted, or their session has somehow been terminated.
    throw new AuthSessionMissingError()
  }

  throw new AuthApiError(_getErrorMessage(data), error.status || 500, errorCode)
}

async function _handleRequest(
  fetcher: Fetch,
  method: RequestMethodType,
  url: string,
  options?: FetchOptions,
  parameters?: FetchParameters,
  body?: object
): Promise<any> {
  const requestParams = _getRequestParams(method, options, parameters, body)

  let result: Response

  try {
    result = await fetcher(url, {
      ...requestParams
    })
  } catch (e) {
    console.error(e)

    // fetch failed, likely due to a network or CORS error
    throw new AuthRetryableFetchError(_getErrorMessage(e), 0)
  }

  if (!result.ok) {
    await handleError(result)
  }

  if (options?.noResolveJson) {
    return result
  }

  try {
    return await result.json()
  } catch (e) {
    await handleError(e)
  }
}

/** Raw session data from GoTrue server response. */
interface AuthSessionData {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  user?: PublicUser
  [key: string]: any // server returns additional fields (token_type, provider_token, etc.) copied into Session
}

/**
 * hasSession checks if the response object contains a valid session
 * @param data A response object
 * @returns true if a session is in the response
 */
function hasSession(data: AuthSessionData): boolean {
  return !!data.access_token && !!data.refresh_token && !!data.expires_in
}

export function expiresAt(expiresIn: number) {
  const timeNow = Math.round(Date.now() / 1000)
  return timeNow + expiresIn
}

export function _sessionResponse(data: AuthSessionData): AuthResponse {
  let session = null
  if (hasSession(data)) {
    session = { ...data } as AccessTokenResponse

    if (!data.expires_at) {
      session.expires_at = expiresAt(data.expires_in!)
    }
  }

  // Some /verify responses (e.g. secure email_change first-confirmation) return
  // only `{ msg, code }` with no user and no session. Treat those as null user.
  const user: PublicUser | null =
    data.user ?? (typeof data?.id === 'string' ? (data as PublicUser) : null)
  return { data: { session, user }, error: null }
}

/** Raw session data that includes weak password info (password sign-in endpoints). */
interface GoTrueSessionPasswordData extends AuthSessionData {
  weak_password?: WeakPassword
}

export function _sessionResponsePassword(data: GoTrueSessionPasswordData): AuthResponsePassword {
  const response = _sessionResponse(data) as AuthResponsePassword

  if (
    !response.error &&
    data.weak_password &&
    typeof data.weak_password === 'object' &&
    Array.isArray(data.weak_password.reasons) &&
    data.weak_password.reasons.length &&
    data.weak_password.message &&
    typeof data.weak_password.message === 'string' &&
    data.weak_password.reasons.reduce((a: boolean, i: unknown) => a && typeof i === 'string', true)
  ) {
    response.data.weak_password = data.weak_password
  }

  return response
}
