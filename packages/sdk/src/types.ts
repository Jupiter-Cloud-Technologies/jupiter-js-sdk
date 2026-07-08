import type { JupiterAuthOptionsv2 } from '@jupiter-cloud/auth'
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

export type JupiterSDKOptions<SchemaName> = {
  /**
   * The Postgres schema which your tables belong to. Must be on the list of exposed schemas in Supabase. Defaults to `public`.
   */
  db?: {
    schema?: SchemaName
  }

  auth?: {
    /**
     * Automatically refreshes the token for logged-in users. Defaults to true.
     */
    autoRefreshToken?: boolean
    /**
     * Optional key name used for storing tokens in local storage.
     */
    storageKey?: string
    /**
     * Whether to persist a logged-in session to storage. Defaults to true.
     */
    persistSession?: boolean
    /**
     * Detect a session from the URL. Used for OAuth login callbacks. Defaults to true.
     *
     * Can be set to a function to provide custom logic for determining if a URL contains
     * a Supabase auth callback. The function receives the current URL and parsed parameters,
     * and should return true if the URL should be processed as a Supabase auth callback.
     *
     * This is useful when your app uses other OAuth providers (e.g., Facebook Login) that
     * also return access_token in the URL fragment, which would otherwise be incorrectly
     * intercepted by Supabase Auth.
     *
     * @example With custom detection logic
     * ```ts
     * detectSessionInUrl: (url, params) => {
     *   // Ignore Facebook OAuth redirects
     *   if (url.pathname === '/facebook/redirect') return false
     *   // Use default detection for other URLs
     *   return Boolean(params.access_token || params.error_description)
     * }
     * ```
     */
    detectSessionInUrl?: boolean | ((url: URL, params: { [parameter: string]: string }) => boolean)
    /**
     * A storage provider. Used to store the logged-in session.
     */
    storage?: JauthClientOptions['storage']
    /**
     * A storage provider to store the user profile separately from the session.
     * Useful when you need to store the session information in cookies,
     * without bloating the data with the redundant user object.
     *
     * @experimental
     */
    userStorage?: JauthClientOptions['userStorage']
    /**
     * OAuth flow to use - defaults to implicit flow. PKCE is recommended for mobile and server-side applications.
     */
    flowType?: JauthClientOptions['flowType']
    /**
     * If debug messages for authentication client are emitted. Can be used to inspect the behavior of the library.
     */
    debug?: JauthClientOptions['debug']
    /**
     * Provide your own locking mechanism based on the environment. By default
     * the auth client coordinates refreshes itself and the server resolves
     * cross-tab races. Passing a custom `lock` opts into a legacy path that
     * wraps every auth operation in your supplied lock.
     *
     * @deprecated Custom locks still work in v2.x for backwards compatibility.
     * The legacy lock path will be removed in v3 — drop this option from your
     * `createClient` options before upgrading.
     */
    lock?: JauthClientOptions['lock']
    /**
     * If there is an error with the query, throwOnError will reject the promise by
     * throwing the error instead of returning it as part of a successful response.
     */
    throwOnError?: JauthClientOptions['throwOnError']
    /**
     * Maximum time in milliseconds to wait for acquiring the custom lock
     * supplied via `lock`. Only consulted when a custom `lock` is passed.
     *
     * @default 5000
     *
     * @deprecated Only used by the legacy lock path. Will be removed in v3
     * along with the `lock` option.
     */
    lockAcquireTimeout?: JauthClientOptions['lockAcquireTimeout']
    /**
     * If true, skips automatic initialization in the auth client constructor.
     * Useful for SSR contexts where initialization timing must be controlled to
     * prevent race conditions with HTTP response generation.
     *
     * @default false
     */
    skipAutoInitialize?: JauthClientOptions['skipAutoInitialize']
  }
  /**
   * Options passed to the realtime-js instance
   */
  // storage?: StorageClientOptions
  global?: {
    /**
     * A custom `fetch` implementation.
     */
    fetch?: Fetch
    /**
     * Optional headers for initializing the client.
     */
    headers?: Record<string, string>
  }
  /**
   * Optional function for using a third-party authentication system with
   * Supabase. The function should return an access token or ID token (JWT) by
   * obtaining it from the third-party auth SDK. Note that this
   * function may be called concurrently and many times. Use memoization and
   * locking techniques if this is not supported by the SDKs.
   *
   * When set, the `auth` namespace of the Supabase client cannot be used.
   * Create another client if you wish to use Supabase Auth and third-party
   * authentications concurrently in the same application.
   */
  accessToken?: () => Promise<string | null>
}

export type JauthClientOptions = JupiterAuthOptionsv2
