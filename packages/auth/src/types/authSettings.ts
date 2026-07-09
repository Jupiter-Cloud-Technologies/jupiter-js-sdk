import type { SupportedStorage } from './storage'
import type { Fetch } from '@jupiter-cloud/core'
import type { AuthFlowType } from './authFlow'

export type AuthClientOptions = {
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

  /**
   * If true, skips automatic initialization in constructor. Useful for SSR
   * contexts where initialization timing must be controlled to prevent race
   * conditions with HTTP response generation.
   * @default false
   */
  skipAutoInitialize?: boolean

  /**
   * Opt-in flags for experimental features. These APIs may change without
   * notice and are disabled by default.
   * @experimental
   */
  experimental?: ExperimentalFeatureFlags
}

export type ExperimentalFeatureFlags = {
  /**
   * Enables passkey support:
   *   - `auth.signInWithPasskey()`, `auth.registerPasskey()`
   *   - `auth.passkey.*`
   *   - `auth.admin.passkey.*`
   * Defaults to `false`. Calling any passkey method while this flag is
   * disabled throws a descriptive error at call time.
   */
  passkey?: boolean
}
