import type { Fetch, JsonObject } from '@jupiter-cloud/core'
import type { CodeChallengeMethod, OAuthProvider, OAuthScopes, ProjectId } from './primitives'
import type { SupportedStorage } from './storage'
import type { AuthFlowType } from './authFlow'
import type { LockFunc } from './mfa'

export type JupiterAuthOptionsv2 = {
  /* The URL of the Jupiter Auth server. */
  url?: string
  /* Any additional headers to send to the Jupiter Auth server. */
  headers?: { [key: string]: string }
  /* Optional key name used for storing tokens in local storage. */
  storageKey?: string
  /**
   * Set to "true" if you want to automatically detect OAuth grants in the URL and sign in the user.
   * Set to "false" to disable automatic detection.
   * Set to a function to provide custom logic for determining if a URL contains a Jupiter auth callback.
   * The function receives the current URL and parsed parameters, and should return true if the URL
   * should be processed as a Jupiter auth callback, or false to ignore it.
   * This is useful when your app uses other OAuth providers (e.g., Facebook Login) that also return
   * access_token in the URL fragment, which would otherwise be incorrectly intercepted by Jupiter Auth.
   */
  detectSessionInUrl?: boolean | ((url: URL, params: { [parameter: string]: string }) => boolean)
  /* Set to "true" if you want to automatically refresh the token before expiring. */
  autoRefreshToken?: boolean
  /* Set to "true" if you want to automatically save the user session into local storage. If set to false, session will just be saved in memory. */
  persistSession?: boolean
  /* Provide your own local storage implementation to use instead of the browser's local storage. */
  storage?: SupportedStorage
  /**
   * Stores the user object in a separate storage location from the rest of the session data. When non-null, `storage` will only store a JSON object containing the access and refresh token and some adjacent metadata, while `userStorage` will only contain the user object under the key `storageKey + '-user'`.
   * When this option is set and cookie storage is used, `getSession()` and other functions that load a session from the cookie store might not return back a user. It's very important to always use `getUser()` to fetch a user object in those scenarios.
   * @experimental
   */
  userStorage?: SupportedStorage
  /* A custom fetch implementation. */
  fetch?: Fetch
  /* If set to 'pkce' PKCE flow. Defaults to the 'implicit' flow otherwise */
  flowType?: AuthFlowType
  /* If debug messages are emitted. Can be used to inspect the behavior of the library. If set to a function, the provided function will be used instead of `console.log()` to perform the logging. */
  debug?: boolean | ((message: string, ...args: any[]) => void)
  /**
   * Provide your own locking mechanism based on the environment. By default
   * the client coordinates refreshes itself (single-flight via
   * `refreshingDeferred` + commit guard) and relies on the Jupiter Auth server to
   * resolve cross-tab refresh races. Passing a custom lock opts into a
   * legacy path that wraps every auth operation in your supplied lock — this
   * path is preserved for backwards compatibility (typically React Native
   * `processLock` or Node multi-process setups).
   * @deprecated Custom locks still work in v2.x for backwards compatibility.
   * The legacy lock path will be removed in v3 — drop this option from your
   * constructor options before upgrading.
   */
  lock?: LockFunc
  /**
   * Set to "true" if there is a custom authorization header set globally.
   * @experimental
   */
  hasCustomAuthorizationHeader?: boolean
  /**
   * If there is an error with the query, throwOnError will reject the promise by
   * throwing the error instead of returning it as part of a successful response.
   */
  throwOnError?: boolean
  /**
   * The maximum time in milliseconds to wait for acquiring the custom lock
   * supplied via the `lock` option. Only consulted when a custom `lock` is
   * passed — the default lockless path doesn't use this timeout.
   * @default 5000
   * @deprecated Only used by the legacy lock path. Will be removed in v3
   * along with the `lock` option.
   */
  lockAcquireTimeout?: number

  projectId: string

  /**
   * If true, skips automatic initialization in constructor. Useful for SSR
   * contexts where initialization timing must be controlled to prevent race
   * conditions with HTTP response generation.
   * @default false
   */
  skipAutoInitialize?: boolean
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
