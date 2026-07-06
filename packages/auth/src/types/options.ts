import type { Fetch, JsonObject } from '@jupiter-cloud/core'
import type { CodeChallengeMethod, OAuthProvider, OAuthScopes, ProjectId } from './primitives'

/** Options used to construct a standalone Jupiter Auth client. */
export type JupiterAuthOptions = {
  /** Default access token claims encoded into `X-Jupiter-Claims` for authenticated user calls. */
  claims?: JsonObject | string | undefined

  /** Custom fetch implementation for non-standard runtimes or instrumentation. */
  fetch?: Fetch | undefined

  /** Additional headers sent with every Auth API request. */
  headers?: HeadersInit | undefined

  /** Project identifier sent as the Jupiter project header. */
  projectId: string

  /** Number of attempts for retryable requests. Defaults to one attempt. */
  retryAttempts?: number | undefined

  /** Request timeout in milliseconds. */
  timeoutMs?: number | undefined

  /** Bearer token sent as the `Authorization` header. */
  token?: string | undefined
}

/** Common per-request options accepted by Auth methods. */
export type AuthRequestOptions = {
  /** Request abort signal. */
  signal?: AbortSignal | undefined
}

/** Per-request options for endpoints that support redirect targets. */
export type RedirectRequestOptions = AuthRequestOptions & {
  /** Optional redirect target sent as the `redirect_to` header. */
  redirectTo?: string | undefined
}

/** Per-request options for authenticated user endpoints. */
export type AuthenticatedRequestOptions = AuthRequestOptions & {
  /** Access token claims encoded into `X-Jupiter-Claims`. Overrides constructor claims. */
  claims?: JsonObject | string | undefined
}

/** Per-request options for endpoints that need an explicit bearer token. */
export type BearerTokenRequestOptions = AuthRequestOptions & {
  /** Bearer token sent as the `Authorization` header for this request. */
  token?: string | undefined
}

/** Options for starting an external OAuth flow. */
export type AuthorizeUrlOptions = {
  provider: OAuthProvider
  scopes?: OAuthScopes
  inviteToken?: string
  codeChallenge?: string
  codeChallengeMethod?: CodeChallengeMethod
  redirectTo?: string
  projectId?: ProjectId
}

/** Options for linking an external identity to the current user. */
export type LinkIdentityOptions = AuthenticatedRequestOptions & {
  provider: OAuthProvider
  scopes?: OAuthScopes
  skipHttpRedirect?: boolean
  codeChallenge?: string
  codeChallengeMethod?: CodeChallengeMethod
}

/** Admin list users query options. */
export type AdminListUsersOptions = AuthRequestOptions & {
  page?: number
  perPage?: number
  sort?: 'created_at asc' | 'created_at desc'
  filter?: string
}
