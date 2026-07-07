import { JUPITER_PROJECT_ID_HEADER, type Fetch } from '@jupiter-cloud/core'
import type {
  AccessTokenResponse,
  AnonymousSignupRequest,
  AuthorizeUrlOptions,
  OAuthCallbackForm,
  PublicFactor,
  PublicUser,
  AuthResponse,
  SignUpWithPasswordRequest,
  SignInWithEmailAndPasswordRequest,
  SignInWithPhoneAndPasswordRequest,
  AuthTokenResponsePassword,
  AuthResponsePassword,
  SignInWithOAuthRequest,
  OAuthResponse,
  AuthTokenResponse,
  SignInWithIdTokenRequest,
  signInWithEmailCredentials,
  signInWithPhoneCredentials,
  AuthOtpResponse,
  VerifySignupConfirmParams,
  VerifySigninConfirmParams,
  VerifyPasswordRecoveryParams,
  AttributeChangeConfirmParams,
  CallRefreshTokenResult,
  UserResponse,
  UserAttributes,
  SignOut,
  PublicIdentity,
  SignInWithOAuthCredentials,
  SignInWithIdTokenCredentials,
  MFAUnenrollParams,
  AuthMFAUnenrollResponse,
  MFAEnrollTOTPParams,
  MFAEnrollPhoneParams,
  MFAEnrollWebauthnParams,
  MFAEnrollParams,
  AuthMFAEnrollTOTPResponse,
  AuthMFAEnrollPhoneResponse,
  AuthMFAEnrollWebauthnResponse,
  AuthMFAEnrollResponse,
  MFAVerifyTOTPParams,
  MFAVerifyPhoneParams,
  AuthMFAVerifyResponse,
  JupiterAuthOptionsv2
} from './types'
import type { JWK } from './types/jwk'
import {
  deepClone,
  Deferred,
  generateCallbackId,
  getAlgorithm,
  getCodeChallengeAndMethod,
  getItemAsync,
  insecureUserWarningProxy,
  isAuthImplicitGrantRedirectError,
  isBrowser,
  parseParametersFromURL,
  removeItemAsync,
  resolveFetch,
  retryable,
  setItemAsync,
  sleep,
  supportsLocalStorage,
  userNotAvailableProxy,
  validateExp
} from './internal/helpers'
import { _request, _sessionResponse, _sessionResponsePassword } from './internal/fetch'
import {
  AuthError,
  AuthImplicitGrantRedirectError,
  AuthInvalidCredentialsError,
  AuthInvalidJwtError,
  AuthInvalidTokenResponseError,
  AuthPKCECodeVerifierMissingError,
  AuthPKCEGrantCodeExchangeError,
  AuthRefreshDiscardedError,
  AuthSessionMissingError,
  AuthUnknownError,
  isAuthApiError,
  isAuthError,
  isAuthRefreshDiscardedError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError
} from './internal/errors'
import type { AuthChangeEvent } from './types/authEvents'
import type { Provider } from './types/providers'
import {
  AUTO_REFRESH_TICK_DURATION_MS,
  AUTO_REFRESH_TICK_THRESHOLD,
  EXPIRY_MARGIN_MS,
  JWKS_TTL,
  REFRESH_FAILURE_COOLDOWN_MS
} from './internal/constants'
import { _userResponse } from './types/fetch'
import {
  decodeJWT,
  type AuthMFAGetAuthenticatorAssuranceLevelResponse,
  type JwtHeader,
  type JwtPayload
} from './internal/crypto'
import { SIGN_OUT_SCOPES, type SignOutScope } from './types/scopes'
import type { Subscription } from './types/subscription'
import { LockAcquireTimeoutError } from './internal/lock'
import type {
  AuthenticatorAssuranceLevels,
  AuthMFAChallengePhoneResponse,
  AuthMFAChallengeResponse,
  AuthMFAChallengeTOTPResponse,
  AuthMFAChallengeWebauthnResponse,
  AuthMFAChallengeWebauthnResponseDataJSON,
  AuthMFAChallengeWebauthnServerResponse,
  AuthMFAListFactorsResponse,
  ExperimentalFeatureFlags,
  MFAApi,
  InitializeResult,
  LockFunc,
  MFAChallengeAndVerifyParams,
  MFAChallengeParams,
  MFAChallengePhoneParams,
  MFAChallengeTOTPParams,
  MFAChallengeWebauthnParams,
  MFAVerifyParams,
  MFAVerifyWebauthnParamFields,
  MFAVerifyWebauthnParams,
  Prettify,
  StrictOmit
} from './types/mfa'
import type {
  AuthenticationCredential,
  PublicKeyCredentialJSON,
  RegistrationCredential
} from './types/webauthn.dom'
import {
  deserializeCredentialCreationOptions,
  deserializeCredentialRequestOptions,
  serializeCredentialCreationResponse,
  serializeCredentialRequestResponse,
  WebAuthnApi
} from './internal/webauthn'
import type { AuthFlowType } from './types/authFlow'
import type { SupportedStorage } from './types/storage'
import type { AuthClientOptions } from './types/authSettings'
import { stringToUint8Array } from './internal/base64'
import { memoryLocalStorageAdapter } from './internal/local-storage'
import { polyfillGlobalThis } from './internal/polyfills'

polyfillGlobalThis() // Make "globalThis" available

export const GOTRUE_URL = 'http://localhost:9999'
export const STORAGE_KEY = 'jupiter.auth.token'

export const DEFAULT_HEADERS = {
  'X-Client-Info': ''
}

const DEFAULT_OPTIONS: Omit<
  Required<AuthClientOptions>,
  'fetch' | 'storage' | 'userStorage' | 'lock'
> = {
  url: GOTRUE_URL,
  storageKey: STORAGE_KEY,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  headers: DEFAULT_HEADERS,
  flowType: 'implicit',
  debug: false,
  hasCustomAuthorizationHeader: false,
  throwOnError: false,
  lockAcquireTimeout: 5000, // 5 seconds. Only used when a custom `lock` is supplied. TODO(v3): remove.
  skipAutoInitialize: false,
  experimental: {}
}

/**
 * Caches JWKS values for all clients created in the same environment. This is
 * especially useful for shared-memory execution environments such as Vercel's
 * Fluid Compute, AWS Lambda or Supabase's Edge Functions. Regardless of how
 * many clients are created, if they share the same storage key they will use
 * the same JWKS cache, significantly speeding up getClaims() with asymmetric
 * JWTs.
 */
const GLOBAL_JWKS: { [storageKey: string]: { cachedAt: number; jwks: { keys: JWK[] } } } = {}

/**
 * Client for Jupiter Auth.
 *
 * This class exposes service-level methods directly. Users should call
 * `jupiter.auth.signUp(...)`, `jupiter.auth.signInWithPassword(...)`, and
 * similar methods from the aggregate Jupiter client.
 */
export class JupiterAuth {
  readonly projectId: string

  private readonly baseUrl: string

  private static nextInstanceID: Record<string, number> = {}

  private instanceID: number

  // admin: GoTrueAdminApi

  mfa: MFAApi

  /**
   * The storage key used to identify the values saved in localStorage
   */
  protected storageKey: string

  protected flowType: AuthFlowType

  /**
   * The JWKS used for verifying asymmetric JWTs
   */
  protected get jwks() {
    return GLOBAL_JWKS[this.storageKey]?.jwks ?? { keys: [] }
  }

  protected set jwks(value: { keys: JWK[] }) {
    GLOBAL_JWKS[this.storageKey] = { ...GLOBAL_JWKS[this.storageKey], jwks: value }
  }

  protected get jwks_cached_at() {
    return GLOBAL_JWKS[this.storageKey]?.cachedAt ?? Number.MIN_SAFE_INTEGER
  }

  protected set jwks_cached_at(value: number) {
    GLOBAL_JWKS[this.storageKey] = { ...GLOBAL_JWKS[this.storageKey], cachedAt: value }
  }

  protected autoRefreshToken: boolean
  protected persistSession: boolean
  protected storage: SupportedStorage
  /**
   * @experimental
   */
  protected userStorage: SupportedStorage | null = null
  protected memoryStorage: { [key: string]: string } | null = null
  protected stateChangeEmitters: Map<string | symbol, Subscription> = new Map()
  protected autoRefreshTicker: ReturnType<typeof setInterval> | null = null
  protected autoRefreshTickTimeout: ReturnType<typeof setTimeout> | null = null
  protected visibilityChangedCallback: (() => Promise<any>) | null = null
  protected refreshingDeferred: Deferred<CallRefreshTokenResult> | null = null

  /**
   * Cache of the most recent refresh failure, keyed by the refresh token
   * that failed. Serial callers passing the *same* token within
   * `REFRESH_FAILURE_COOLDOWN_MS` (including subsequent auto-refresh ticks)
   * receive this cached result instead of firing another `/token` request.
   * Callers passing a *different* token (token rotation pickup, explicit
   * `setSession`/`refreshSession({ refresh_token })`, multi-account switch)
   * bypass the cache and attempt a fresh refresh as they should.
   * Cleared on any successful refresh (locally or via BroadcastChannel from
   * another tab) and on `_removeSession`.
   *
   * Pairs with `refreshingDeferred`: concurrent callers share the in-flight
   * promise, serial callers within the cooldown share the failure result.
   */
  protected lastRefreshFailure: {
    refreshToken: string
    result: CallRefreshTokenResult
    expiresAt: number
  } | null = null

  /**
   * Monotonic counter incremented at the top of `_removeSession`, before any
   * `await`. The commit guard inside `_callRefreshToken` captures this value
   * before `_saveSession` and re-checks it after, so a `signOut` that
   * interleaves inside `_saveSession`'s storage-write awaits is still caught
   * (the post-fetch storage snapshot alone misses that window).
   */
  protected _sessionRemovalEpoch = 0

  /**
   * Keeps track of the async client initialization.
   * When null or not yet resolved the auth state is `unknown`
   * Once resolved the auth state is known and it's safe to call any further client methods.
   * Keep extra care to never reject or throw uncaught errors
   */
  protected initializePromise: Promise<InitializeResult> | null = null
  protected detectSessionInUrl:
    boolean | ((url: URL, params: { [parameter: string]: string }) => boolean) = true
  protected url: string
  protected headers: {
    [key: string]: string
  }
  protected hasCustomAuthorizationHeader = false
  protected suppressGetSessionWarning = false
  protected fetch: Fetch

  /**
   * Custom lock function passed via `settings.lock`. When non-null, every auth
   * operation runs inside `_acquireLock`. When null (the default), the client
   * uses its lockless coordination (refresh single-flight + commit guard).
   * TODO(v3): remove along with the legacy lock path.
   */
  protected lock: LockFunc | null = null
  protected lockAcquired = false
  protected pendingInLock: Promise<any>[] = []
  protected throwOnError: boolean

  /**
   * Only consulted when a custom `lock` is supplied. TODO(v3): remove.
   */
  protected lockAcquireTimeout: number
  /**
   * Opt-in flags for experimental features. Defaults to an empty object.
   * See `GoTrueClientOptions.experimental`.
   */
  protected experimental: ExperimentalFeatureFlags

  /**
   * Used to broadcast state change events to other tabs listening.
   */
  protected broadcastChannel: BroadcastChannel | null = null

  protected logDebugMessages: boolean
  protected logger: (message: string, ...args: any[]) => void = console.log

  constructor(url: string, options: JupiterAuthOptionsv2) {
    const settings = { ...DEFAULT_OPTIONS, ...options, url }
    this.storageKey = settings.storageKey

    this.instanceID = JupiterAuth.nextInstanceID[this.storageKey] ?? 0
    JupiterAuth.nextInstanceID[this.storageKey] = this.instanceID + 1

    this.logDebugMessages = !!settings.debug
    if (typeof settings.debug === 'function') {
      this.logger = settings.debug
    }

    if (this.instanceID > 0 && isBrowser()) {
      const message = `${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`
      console.warn(message)
      if (this.logDebugMessages) {
        console.trace(message)
      }
    }

    this.persistSession = settings.persistSession
    this.autoRefreshToken = settings.autoRefreshToken
    this.experimental = settings.experimental ?? {}

    this.url = settings.url
    this.headers = { ...settings.headers, [JUPITER_PROJECT_ID_HEADER]: options.projectId }
    this.fetch = resolveFetch(settings.fetch)
    this.detectSessionInUrl = settings.detectSessionInUrl
    this.flowType = settings.flowType
    this.hasCustomAuthorizationHeader = settings.hasCustomAuthorizationHeader
    this.throwOnError = settings.throwOnError

    // Always wire `lockAcquireTimeout` even on the lockless path: consumers
    // (including supabase-js tests) read it off the client to verify option
    // flow-through.
    this.lockAcquireTimeout = settings.lockAcquireTimeout

    if (!this.jwks) {
      this.jwks = { keys: [] }
      this.jwks_cached_at = Number.MIN_SAFE_INTEGER
    }

    this.mfa = {
      verify: this._verify.bind(this),
      enroll: this._enroll.bind(this),
      unenroll: this._unenroll.bind(this),
      challenge: this._challenge.bind(this),
      listFactors: this._listFactors.bind(this),
      challengeAndVerify: this._challengeAndVerify.bind(this),
      getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this),
      webauthn: new WebAuthnApi(this)
    }

    if (this.persistSession) {
      if (settings.storage) {
        this.storage = settings.storage
      } else {
        if (supportsLocalStorage()) {
          this.storage = globalThis.localStorage
        } else {
          this.memoryStorage = {}
          this.storage = memoryLocalStorageAdapter(this.memoryStorage)
        }
      }

      if (settings.userStorage) {
        this.userStorage = settings.userStorage
      }
    } else {
      this.memoryStorage = {}
      this.storage = memoryLocalStorageAdapter(this.memoryStorage)
    }

    if (isBrowser() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
      try {
        this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey)
      } catch (e) {
        console.error(
          'Failed to create a new BroadcastChannel, multi-tab state changes will not be available',
          e
        )
      }

      this.broadcastChannel?.addEventListener('message', async (event) => {
        this._debug('received broadcast notification from other tab or client', event)

        // Another tab successfully refreshed or signed in — any cached
        // failure in this tab is stale and should not block the next
        // refresh attempt.
        if (event.data.event === 'TOKEN_REFRESHED' || event.data.event === 'SIGNED_IN') {
          this.lastRefreshFailure = null
        }

        try {
          await this._notifyAllSubscribers(event.data.event, event.data.session, false) // broadcast = false so we don't get an endless loop of messages
        } catch (error) {
          this._debug('#broadcastChannel', 'error', error)
        }
      })
    }

    if (!settings.skipAutoInitialize) {
      this.initialize().catch((error) => {
        this._debug('#initialize()', 'error', error)
      })
    }

    this.baseUrl = url.replace(/\/+$/, '')
    this.projectId = options.projectId
  }

  /**
   * Returns whether error throwing mode is enabled for this client.
   */
  public isThrowOnErrorEnabled(): boolean {
    return this.throwOnError
  }

  /**
   * Centralizes return handling with optional error throwing. When `throwOnError` is enabled
   * and the provided result contains a non-nullish error, the error is thrown instead of
   * being returned. This ensures consistent behavior across all public API methods.
   */
  private _returnResult<T extends { error: any }>(result: T): T {
    if (this.throwOnError && result && result.error) {
      throw result.error
    }
    return result
  }

  private _logPrefix(): string {
    return (
      'GoTrueClient@' + `${this.storageKey}:${this.instanceID} (${''}) ${new Date().toISOString()}`
    )
  }

  private _debug(...args: any[]): JupiterAuth {
    if (this.logDebugMessages) {
      this.logger(this._logPrefix(), ...args)
    }

    return this
  }

  /**
   * Initialize the auth client by loading the session from storage or
   * detecting it from the URL after an OAuth, magic-link, or password-recovery
   * redirect.
   *
   * **Most callers do not need to invoke this directly.** The client calls it
   * automatically during construction, and to react to sign-in events (including
   * post-redirect events) you should subscribe to `onAuthStateChange` rather
   * than awaiting `initialize()`.
   *
   * You only need to call it manually when you have opted out of the automatic
   * call by passing `skipAutoInitialize: true` — for example, in an SSR context
   * where you need to control initialization timing. In that case, awaiting
   * `initialize()` returns the resolved session result (or any error encountered
   * while detecting it from the URL).
   *
   * @category Auth
   */
  async initialize(): Promise<InitializeResult> {
    if (this.initializePromise) {
      return await this.initializePromise
    }

    this.initializePromise = (async () => {
      if (this.lock != null) {
        // TODO(v3): remove legacy lock path
        return await this._acquireLock(this.lockAcquireTimeout, async () => {
          return await this._initialize()
        })
      }
      return await this._initialize()
    })()

    return await this.initializePromise
  }

  /**
   * IMPORTANT:
   * 1. Never throw in this method, as it is called from the constructor
   * 2. Never return a session from this method as it would be cached over
   *    the whole lifetime of the client
   */
  private async _initialize(): Promise<InitializeResult> {
    try {
      let params: { [parameter: string]: string } = {}
      let callbackUrlType = 'none'

      if (isBrowser()) {
        params = parseParametersFromURL(window.location.href)
        if (this._isImplicitGrantCallback(params)) {
          callbackUrlType = 'implicit'
        } else if (await this._isPKCECallback(params)) {
          callbackUrlType = 'pkce'
        }
      }

      /**
       * Attempt to get the session from the URL only if these conditions are fulfilled
       *
       * Note: If the URL isn't one of the callback url types (implicit or pkce),
       * then there could be an existing session so we don't want to prematurely remove it
       */
      if (isBrowser() && this.detectSessionInUrl && callbackUrlType !== 'none') {
        const { data, error } = await this._getSessionFromURL(params, callbackUrlType)
        if (error) {
          this._debug('#_initialize()', 'error detecting session from URL', error)

          if (isAuthImplicitGrantRedirectError(error)) {
            const errorCode = error.code
            if (
              errorCode === 'identity_already_exists' ||
              errorCode === 'identity_not_found' ||
              errorCode === 'single_identity_not_deletable'
            ) {
              return { error }
            }
          }

          // Don't remove existing session on URL login failure.
          // A failed attempt (e.g. reused magic link) shouldn't invalidate a valid session.

          return { error }
        }

        const { session, redirectType } = data

        this._debug(
          '#_initialize()',
          'detected session in URL',
          session,
          'redirect type',
          redirectType
        )

        await this._saveSession(session)

        setTimeout(async () => {
          if (redirectType === 'recovery') {
            await this._notifyAllSubscribers('PASSWORD_RECOVERY', session)
          } else {
            await this._notifyAllSubscribers('SIGNED_IN', session)
          }
        }, 0)

        return { error: null }
      }
      // no login attempt via callback url try to recover session from storage
      await this._recoverAndRefresh()
      return { error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ error })
      }

      return this._returnResult({
        error: new AuthUnknownError('Unexpected error during initialization', error)
      })
    } finally {
      await this._handleVisibilityChange()
      this._debug('#_initialize()', 'end')
    }
  }

  /**
   * Build the external provider authorization URL.
   *
   * This is the preferred browser entrypoint for OAuth because `/authorize`
   * normally responds with an HTTP redirect.
   */
  getAuthorizeUrl(options: AuthorizeUrlOptions): string {
    return this.createUrl('/authorize', {
      code_challenge: options.codeChallenge,
      code_challenge_method: options.codeChallengeMethod,
      invite_token: options.inviteToken,
      project_id: options.projectId,
      provider: options.provider,
      redirect_to: options.redirectTo,
      scopes: options.scopes
    })
  }

  /** Build an external provider callback URL. Mostly useful for server-side callback handlers. */
  getExternalProviderCallbackUrl(options: Omit<OAuthCallbackForm, 'user'>): string {
    return this.createUrl('/callback', {
      code: options.code,
      error: options.error,
      error_description: options.error_description,
      oauth_token: options.oauth_token,
      oauth_verifier: options.oauth_verifier,
      state: options.state
    })
  }

  /// Anonymous Sign-in
  async signInAnonymously(credentials?: AnonymousSignupRequest): Promise<AuthResponse> {
    try {
      const res = await _request(this.fetch, 'POST', `${this.url}/signup/anonymous`, {
        headers: this.headers,
        body: {
          attributes: credentials?.attributes ?? {}
          // gotrue_meta_security: { captcha_token: credentials?.options?.captchaToken },
        },
        xform: _sessionResponse
      })
      const { data, error } = res

      if (error || !data) {
        return this._returnResult({ data: { user: null, session: null }, error: error })
      }
      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user ?? data.session?.user ?? null

      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }
      throw error
    }
  }

  // Email signup with password
  async signUpWithEmailAndPassword(credentials: SignUpWithPasswordRequest): Promise<AuthResponse> {
    try {
      let res: AuthResponse
      const { email, password, attributes, options } = credentials
      let codeChallenge: string | undefined = undefined
      let codeChallengeMethod: string | undefined = undefined
      if (this.flowType === 'pkce') {
        ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
          this.storage,
          this.storageKey
        )
      }

      res = await _request(this.fetch, 'POST', `${this.url}/signup`, {
        headers: this.headers,
        ...(options?.emailRedirectTo ? { redirectTo: options.emailRedirectTo } : {}),
        body: {
          email,
          password,
          attributes: attributes ?? {},
          // gotrue_meta_security: { captcha_token: options?.captchaToken },
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod
        },
        xform: _sessionResponse
      })

      const { data, error } = res

      if (error || !data) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
        return this._returnResult({ data: { user: null, session: null }, error: error })
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  // Phone signup with password
  async signUpWithPhoneAndPassword(credentials: SignUpWithPasswordRequest): Promise<AuthResponse> {
    try {
      let res: AuthResponse
      const { email, password, attributes, options } = credentials
      let codeChallenge: string | undefined = undefined
      let codeChallengeMethod: string | undefined = undefined
      if (this.flowType === 'pkce') {
        ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
          this.storage,
          this.storageKey
        )
      }

      res = await _request(this.fetch, 'POST', `${this.url}/signup`, {
        headers: this.headers,
        ...(options?.emailRedirectTo ? { redirectTo: options.emailRedirectTo } : {}),
        body: {
          email,
          password,
          attributes: attributes ?? {},
          // gotrue_meta_security: { captcha_token: options?.captchaToken },
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod
        },
        xform: _sessionResponse
      })

      const { data, error } = res

      if (error || !data) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
        return this._returnResult({ data: { user: null, session: null }, error: error })
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  // Password sign-in
  async signInWithEmailAndPassword(
    credentials: SignInWithEmailAndPasswordRequest
  ): Promise<AuthTokenResponsePassword> {
    try {
      let res: AuthResponsePassword
      if ('email' in credentials) {
        const { email, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
          headers: this.headers,
          body: {
            email,
            password,
            ...(options?.captchaToken
              ? { gotrue_meta_security: { captcha_token: options.captchaToken } }
              : {})
          },
          xform: _sessionResponsePassword
        })
      } else if ('phone' in credentials) {
        const { phone, password } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
          headers: this.headers,
          body: {
            phone,
            password
            // gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
          xform: _sessionResponsePassword
        })
      } else {
        throw new AuthInvalidCredentialsError(
          'You must provide either an email or phone number and a password'
        )
      }
      const { data, error } = res

      if (error) {
        return this._returnResult({ data: { user: null, session: null }, error })
      } else if (!data || !data.session || !data.user) {
        const invalidTokenError = new AuthInvalidTokenResponseError()
        return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError })
      }
      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers('SIGNED_IN', data.session)
      }
      return this._returnResult({
        data: {
          user: data.user,
          session: data.session,
          ...(data.weak_password ? { weakPassword: data.weak_password } : null)
        },
        error
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }
      throw error
    }
  }

  // Password sign-in
  async signInWithPhoneAndPassword(
    credentials: SignInWithPhoneAndPasswordRequest
  ): Promise<AuthTokenResponsePassword> {
    try {
      let res: AuthResponsePassword
      if ('email' in credentials) {
        const { email, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
          headers: this.headers,
          body: {
            email,
            password,
            ...(options?.captchaToken
              ? { gotrue_meta_security: { captcha_token: options.captchaToken } }
              : {})
          },
          xform: _sessionResponsePassword
        })
      } else if ('phone' in credentials) {
        const { phone, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
          headers: this.headers,
          body: {
            phone,
            password,
            ...(options?.captchaToken
              ? { gotrue_meta_security: { captcha_token: options.captchaToken } }
              : {})
          },
          xform: _sessionResponsePassword
        })
      } else {
        throw new AuthInvalidCredentialsError(
          'You must provide either an email or phone number and a password'
        )
      }
      const { data, error } = res

      if (error) {
        return this._returnResult({ data: { user: null, session: null }, error })
      } else if (!data || !data.session || !data.user) {
        const invalidTokenError = new AuthInvalidTokenResponseError()
        return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError })
      }
      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers('SIGNED_IN', data.session)
      }
      return this._returnResult({
        data: {
          user: data.user,
          session: data.session,
          ...(data.weak_password ? { weakPassword: data.weak_password } : null)
        },
        error
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }
      throw error
    }
  }

  /// Sign-in with social provider
  async signInWithSocial(credentials: SignInWithOAuthRequest): Promise<OAuthResponse> {
    return await this._handleProviderSignIn(credentials.provider, {
      ...(credentials.options?.redirectTo === undefined
        ? {}
        : { redirectTo: credentials.options.redirectTo }),
      ...(credentials.options?.scopes === undefined ? {} : { scopes: credentials.options.scopes }),
      ...(credentials.options?.queryParams === undefined
        ? {}
        : { queryParams: credentials.options.queryParams }),
      ...(credentials.options?.skipBrowserRedirect === undefined
        ? {}
        : { skipBrowserRedirect: credentials.options.skipBrowserRedirect })
    })
  }

  /// PKCE
  async exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse> {
    await this.initializePromise
    return this._exchangeCodeForSession(authCode)
  }

  /// ID TOKEN
  async signInWithIdToken(credentials: SignInWithIdTokenRequest): Promise<AuthTokenResponse> {
    try {
      const { provider, token, access_token, nonce } = credentials

      const res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=id_token`, {
        headers: this.headers,
        body: {
          provider,
          id_token: token,
          access_token,
          nonce
          // gotrue_meta_security: { captcha_token: options?.captchaToken },
        },
        xform: _sessionResponse
      })

      const { data, error } = res
      if (error) {
        return this._returnResult({ data: { user: null, session: null }, error })
      } else if (!data || !data.session || !data.user) {
        const invalidTokenError = new AuthInvalidTokenResponseError()
        return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError })
      }
      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers('SIGNED_IN', data.session)
      }
      return this._returnResult({ data, error })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }
      throw error
    }
  }

  async signInWithEmail(credentials: signInWithEmailCredentials): Promise<AuthOtpResponse> {
    try {
      if ('email' in credentials) {
        const { email, options, attributes, createIfNotExists } = credentials
        let codeChallenge: string | undefined = undefined
        let codeChallengeMethod: string | undefined = undefined
        if (this.flowType === 'pkce') {
          ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
            this.storage,
            this.storageKey
          )
        }

        const { error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
          headers: this.headers,
          body: {
            email,
            data: attributes ?? {},
            create_user: createIfNotExists ?? true,
            // gotrue_meta_security: { captcha_token: options?.captchaToken },
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod
          },
          redirectTo: options?.emailRedirectTo
        })
        return this._returnResult({ data: { user: null, session: null }, error })
      }
      if ('phone' in credentials) {
        const { phone, attributes, createIfNotExists } = credentials
        const { data, error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
          headers: this.headers,
          body: {
            phone,
            attributes: attributes ?? {},
            create_user: createIfNotExists ?? true,
            // gotrue_meta_security: { captcha_token: options?.captchaToken },
            channel: 'sms'
            // channel: options?.channel ?? 'sms',
          }
        })
        return this._returnResult({
          data: { user: null, session: null, messageId: data?.message_id },
          error
        })
      }
      throw new AuthInvalidCredentialsError('You must provide either an email or phone number.')
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async signInWithPhone(credentials: signInWithPhoneCredentials): Promise<AuthOtpResponse> {
    try {
      if ('phone' in credentials) {
        const { phone, attributes, createIfNotExists } = credentials
        const { data, error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
          headers: this.headers,
          body: {
            phone,
            data: attributes ?? {},
            create_user: createIfNotExists ?? true,
            // gotrue_meta_security: { captcha_token: options?.captchaToken },
            channel: 'sms'
            // channel: options?.channel ?? 'sms',
          }
        })
        return this._returnResult({
          data: { user: null, session: null, messageId: data?.message_id },
          error
        })
      }
      throw new AuthInvalidCredentialsError('You must provide either an email or phone number.')
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async passwordReset(
    email: string,
    options: {
      redirectTo?: string
      captchaToken?: string
    } = {}
  ): Promise<
    | {
        data: {}
        error: null
      }
    | { data: null; error: AuthError }
  > {
    let codeChallenge: string | undefined = undefined
    let codeChallengeMethod: string | undefined = undefined

    if (this.flowType === 'pkce') {
      ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
        this.storage,
        this.storageKey,
        true // isPasswordRecovery
      )
    }
    try {
      return await _request(this.fetch, 'POST', `${this.url}/forgot-password`, {
        body: {
          email,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          gotrue_meta_security: { captcha_token: options.captchaToken }
        },
        headers: this.headers,
        redirectTo: options.redirectTo
      })
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({ data: null, error })
      }

      throw error
    }
  }

  async passwordResetConfirm(params: VerifyPasswordRecoveryParams): Promise<AuthResponse> {
    try {
      let redirectTo: string | undefined = undefined
      let captchaToken: string | undefined = undefined
      if ('options' in params) {
        redirectTo = params.options?.redirectTo
        captchaToken = params.options?.captchaToken
      }
      let bodyParams
      bodyParams = {
        email: params.email,
        token: params.token,
        new_password: params.new_password
      }

      const { data, error } = await _request(
        this.fetch,
        'POST',
        `${this.url}/forgot-password/verify`,
        {
          headers: this.headers,
          body: {
            ...bodyParams,
            gotrue_meta_security: { captcha_token: captchaToken }
          },
          redirectTo,
          xform: _sessionResponse
        }
      )

      if (error) {
        throw error
      }
      if (!data) {
        const tokenVerificationError = new Error('An error occurred on token verification.')
        throw tokenVerificationError
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (session?.access_token) {
        await this._saveSession(session as AccessTokenResponse)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async signUpConfirm(params: VerifySignupConfirmParams): Promise<AuthResponse> {
    try {
      let redirectTo: string | undefined = undefined
      let captchaToken: string | undefined = undefined
      if ('options' in params) {
        redirectTo = params.options?.redirectTo
        captchaToken = params.options?.captchaToken
      }
      let bodyParams
      if ('email' in params) {
        bodyParams = {
          email: params.email,
          token: params.token,
          type: 'signup'
        }
      } else if ('phone' in params) {
        bodyParams = {
          phone: params.phone,
          token: params.token,
          type: 'sms'
        }
      }

      const { data, error } = await _request(this.fetch, 'POST', `${this.url}/verify`, {
        headers: this.headers,
        body: {
          ...bodyParams,
          gotrue_meta_security: { captcha_token: captchaToken }
        },
        redirectTo,
        xform: _sessionResponse
      })

      if (error) {
        throw error
      }
      if (!data) {
        const tokenVerificationError = new Error('An error occurred on token verification.')
        throw tokenVerificationError
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (session?.access_token) {
        await this._saveSession(session as AccessTokenResponse)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async signInConfirm(params: VerifySigninConfirmParams): Promise<AuthResponse> {
    try {
      let redirectTo: string | undefined = undefined
      let captchaToken: string | undefined = undefined
      if ('options' in params) {
        redirectTo = params.options?.redirectTo
        captchaToken = params.options?.captchaToken
      }

      let bodyParams
      if ('email' in params) {
        bodyParams = {
          email: params.email,
          token: params.token,
          type: 'magiclink'
        }
      } else if ('phone' in params) {
        bodyParams = {
          phone: params.phone,
          token: params.token,
          type: 'sms'
        }
      }

      const { data, error } = await _request(this.fetch, 'POST', `${this.url}/verify`, {
        headers: this.headers,
        body: {
          ...bodyParams,
          gotrue_meta_security: { captcha_token: captchaToken }
        },
        redirectTo,
        xform: _sessionResponse
      })

      if (error) {
        throw error
      }
      if (!data) {
        const tokenVerificationError = new Error('An error occurred on token verification.')
        throw tokenVerificationError
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (session?.access_token) {
        await this._saveSession(session as AccessTokenResponse)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async inviteConfirm(params: VerifySigninConfirmParams): Promise<AuthResponse> {
    try {
      let redirectTo: string | undefined = undefined
      let captchaToken: string | undefined = undefined
      if ('options' in params) {
        redirectTo = params.options?.redirectTo
        captchaToken = params.options?.captchaToken
      }

      let bodyParams
      if ('email' in params) {
        bodyParams = {
          email: params.email,
          token: params.token,
          type: 'invite'
        }
      }

      const { data, error } = await _request(this.fetch, 'POST', `${this.url}/verify`, {
        headers: this.headers,
        body: {
          ...bodyParams,
          gotrue_meta_security: { captcha_token: captchaToken }
        },
        redirectTo,
        xform: _sessionResponse
      })

      if (error) {
        throw error
      }
      if (!data) {
        const tokenVerificationError = new Error('An error occurred on token verification.')
        throw tokenVerificationError
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (session?.access_token) {
        await this._saveSession(session as AccessTokenResponse)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async attributeChangeConfirm(params: AttributeChangeConfirmParams): Promise<AuthResponse> {
    try {
      let redirectTo: string | undefined = undefined
      let captchaToken: string | undefined = undefined
      if ('options' in params) {
        redirectTo = params.options?.redirectTo
        captchaToken = params.options?.captchaToken
      }

      let attributeKey = params?.attribute_name

      let bodyParams
      if (attributeKey === 'email') {
        bodyParams = {
          email: params.email,
          token: params.token,
          type: 'email_change'
        }
      } else if (attributeKey === 'phone') {
        bodyParams = {
          phone: params.phone,
          token: params.token,
          type: 'phone_change'
        }
      }

      const { data, error } = await _request(this.fetch, 'POST', `${this.url}/verify`, {
        headers: this.headers,
        body: {
          ...bodyParams,
          gotrue_meta_security: { captcha_token: captchaToken }
        },
        redirectTo,
        xform: _sessionResponse
      })

      if (error) {
        throw error
      }
      if (!data) {
        const tokenVerificationError = new Error('An error occurred on token verification.')
        throw tokenVerificationError
      }

      const session: AccessTokenResponse | null = data.session
      const user: PublicUser | null = data.user

      if (session?.access_token) {
        await this._saveSession(session as AccessTokenResponse)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  async getSession() {
    await this.initializePromise

    return await this._useSession(async (result) => {
      return result
    })
  }

  /**
   * Acquires a global lock based on the storage key.
   *
   * TODO(v3): remove along with the legacy lock path. Only called when
   * `this.lock` is non-null (custom lock supplied via constructor). The
   * default lockless path bypasses this entirely.
   */
  private async _acquireLock<R>(acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    this._debug('#_acquireLock', 'begin', acquireTimeout)

    try {
      if (this.lockAcquired) {
        const last = this.pendingInLock.length
          ? this.pendingInLock[this.pendingInLock.length - 1]
          : Promise.resolve()

        const result = (async () => {
          await last
          return await fn()
        })()

        this.pendingInLock.push(
          (async () => {
            try {
              await result
            } catch (_e) {
              // we just care if it finished
            }
          })()
        )

        return result
      }

      return await this.lock!(`lock:${this.storageKey}`, acquireTimeout, async () => {
        this._debug('#_acquireLock', 'lock acquired for storage key', this.storageKey)

        try {
          this.lockAcquired = true

          const result = fn()

          this.pendingInLock.push(
            (async () => {
              try {
                await result
              } catch (e: any) {
                // we just care if it finished
              }
            })()
          )

          await result

          // keep draining the queue until there's nothing to wait on
          while (this.pendingInLock.length) {
            const waitOn = [...this.pendingInLock]

            await Promise.all(waitOn)

            this.pendingInLock.splice(0, waitOn.length)
          }

          return await result
        } finally {
          this._debug('#_acquireLock', 'lock released for storage key', this.storageKey)

          this.lockAcquired = false
        }
      })
    } finally {
      this._debug('#_acquireLock', 'end')
    }
  }

  /**
   * Use instead of {@link #getSession} inside the library. Loads the session
   * via `__loadSession` (which may trigger a refresh if the access token is
   * within the expiry margin) and runs `fn` with the result.
   */
  private async _useSession<R>(
    fn: (
      result:
        | {
            data: {
              session: AccessTokenResponse
            }
            error: null
          }
        | {
            data: {
              session: null
            }
            error: AuthError
          }
        | {
            data: {
              session: null
            }
            error: null
          }
    ) => Promise<R>
  ): Promise<R> {
    this._debug('#_useSession', 'begin')

    try {
      // Concurrent callers may both reach __loadSession; storage reads are
      // idempotent, and the only write path inside it (refresh) is
      // single-flighted downstream by `refreshingDeferred` in
      // `_callRefreshToken`. No serialization is needed at this layer.
      const result = await this.__loadSession()

      return await fn(result)
    } finally {
      this._debug('#_useSession', 'end')
    }
  }

  /**
   * NEVER USE DIRECTLY!
   *
   * Always use {@link #_useSession}.
   */
  private async __loadSession(): Promise<
    | {
        data: {
          session: AccessTokenResponse
        }
        error: null
      }
    | {
        data: {
          session: null
        }
        error: AuthError
      }
    | {
        data: {
          session: null
        }
        error: null
      }
  > {
    this._debug('#__loadSession()', 'begin')

    if (this.lock != null && !this.lockAcquired) {
      // TODO(v3): remove. Only meaningful on the legacy lock path.
      this._debug('#__loadSession()', 'used outside of an acquired lock!', new Error().stack)
    }

    try {
      let currentSession: AccessTokenResponse | null = null

      const maybeSession = await getItemAsync(this.storage, this.storageKey)

      this._debug('#getSession()', 'session from storage', maybeSession)

      if (maybeSession !== null) {
        if (this._isValidSession(maybeSession)) {
          currentSession = maybeSession
        } else {
          this._debug('#getSession()', 'session from storage is not valid')
          await this._removeSession()
        }
      }

      if (!currentSession) {
        return { data: { session: null }, error: null }
      }

      // A session is considered expired before the access token _actually_
      // expires. When the autoRefreshToken option is off (or when the tab is
      // in the background), very eager users of getSession() -- like
      // realtime-js -- might send a valid JWT which will expire by the time it
      // reaches the server.
      const hasExpired = currentSession.expires_at
        ? currentSession.expires_at * 1000 - Date.now() < EXPIRY_MARGIN_MS
        : false

      this._debug(
        '#__loadSession()',
        `session has${hasExpired ? '' : ' not'} expired`,
        'expires_at',
        currentSession.expires_at
      )

      if (!hasExpired) {
        if (this.userStorage) {
          const maybeUser: { user?: PublicUser | null } | null = (await getItemAsync(
            this.userStorage,
            this.storageKey + '-user'
          )) as any

          if (maybeUser?.user) {
            currentSession.user = maybeUser.user
          } else {
            currentSession.user = userNotAvailableProxy()
          }
        }

        // Wrap the user object with a warning proxy on the server
        // This warns when properties of the user are accessed, not when session.user itself is accessed
        if (
          this.storage.isServer &&
          currentSession.user &&
          !(currentSession.user as any).__isUserNotAvailableProxy
        ) {
          const suppressWarningRef = { value: this.suppressGetSessionWarning }
          currentSession.user = insecureUserWarningProxy(currentSession.user, suppressWarningRef)

          // Update the client-level suppression flag when the proxy suppresses the warning
          if (suppressWarningRef.value) {
            this.suppressGetSessionWarning = true
          }
        }

        return { data: { session: currentSession }, error: null }
      }

      const { data: session, error } = await this._callRefreshToken(currentSession.refresh_token)
      if (error) {
        // Proactive-preserve mirror: `_callRefreshToken` keeps the session
        // in storage when refresh fails non-retryably but the access token
        // is still inside its real expiry window. Hand the caller the
        // still-valid session instead of translating the refresh error
        // into `session: null`. If the access token has actually expired,
        // the session is genuinely dead and the error stands. Explicit
        // refresh entry points (`refreshSession`, `setSession`)
        // intentionally bypass this fallback — they want to know the
        // refresh failed.
        const accessTokenStillValid = !!(
          currentSession.expires_at && currentSession.expires_at * 1000 > Date.now()
        )
        if (accessTokenStillValid) {
          // Race guard: a concurrent `signOut` may have cleared storage
          // during the refresh attempt. Don't hand back a session that no
          // longer exists on disk.
          const stillStored = (await getItemAsync(
            this.storage,
            this.storageKey
          )) as AccessTokenResponse | null
          if (stillStored && stillStored.refresh_token === currentSession.refresh_token) {
            return this._returnResult({ data: { session: currentSession }, error: null })
          }
        }
        return this._returnResult({ data: { session: null }, error })
      }

      return this._returnResult({ data: { session }, error: null })
    } finally {
      this._debug('#__loadSession()', 'end')
    }
  }

  async getUser(jwt?: string): Promise<UserResponse> {
    if (jwt) {
      return await this._getUser(jwt)
    }

    await this.initializePromise

    let result: UserResponse
    if (this.lock != null) {
      // TODO(v3): remove legacy lock path
      result = await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._getUser()
      })
    } else {
      result = await this._getUser()
    }

    if (result.data.user) {
      this.suppressGetSessionWarning = true
    }

    return result
  }

  private async _getUser(jwt?: string): Promise<UserResponse> {
    try {
      if (jwt) {
        return await _request(this.fetch, 'GET', `${this.url}/user`, {
          headers: this.headers,
          jwt: jwt,
          xform: _userResponse
        })
      }

      return await this._useSession(async (result) => {
        const { data, error } = result
        if (error) {
          throw error
        }

        // returns an error if there is no access_token or custom authorization header
        if (!data.session?.access_token && !this.hasCustomAuthorizationHeader) {
          return { data: { user: null }, error: new AuthSessionMissingError() }
        }

        return await _request(this.fetch, 'GET', `${this.url}/user`, {
          headers: this.headers,
          jwt: data.session?.access_token ?? undefined,
          xform: _userResponse
        })
      })
    } catch (error) {
      if (isAuthError(error)) {
        if (isAuthSessionMissingError(error)) {
          // JWT contains a `session_id` which does not correspond to an active
          // session in the database, indicating the user is signed out.

          await this._removeSession()
          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
        }

        return this._returnResult({ data: { user: null }, error })
      }

      throw error
    }
  }

  async updateUser(
    attributes: UserAttributes,
    options: {
      emailRedirectTo?: string | undefined
    } = {}
  ): Promise<UserResponse> {
    await this.initializePromise

    if (this.lock != null) {
      // TODO(v3): remove legacy lock path
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._updateUser(attributes, options)
      })
    }

    return await this._updateUser(attributes, options)
  }

  protected async _updateUser(
    attributes: UserAttributes,
    options: {
      emailRedirectTo?: string | undefined
    } = {}
  ): Promise<UserResponse> {
    try {
      return await this._useSession(async (result) => {
        const { data: sessionData, error: sessionError } = result
        if (sessionError) {
          throw sessionError
        }
        if (!sessionData.session) {
          throw new AuthSessionMissingError()
        }
        const session: AccessTokenResponse = sessionData.session
        let codeChallenge: string | undefined = undefined
        let codeChallengeMethod: string | undefined = undefined
        if (this.flowType === 'pkce' && attributes.email != null) {
          ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
            this.storage,
            this.storageKey
          )
        }

        const { data, error: userError } = await _request(this.fetch, 'PUT', `${this.url}/user`, {
          headers: this.headers,
          redirectTo: options?.emailRedirectTo,
          body: {
            ...attributes,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod
          },
          jwt: session.access_token,
          xform: _userResponse
        })
        if (userError) {
          throw userError
        }
        session.user = data.user as PublicUser
        await this._saveSession(session)
        await this._notifyAllSubscribers('USER_UPDATED', session)
        return this._returnResult({ data: { user: session.user }, error: null })
      })
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null }, error })
      }

      throw error
    }
  }

  async setSession(currentSession: {
    access_token: string
    refresh_token: string
  }): Promise<AuthResponse> {
    await this.initializePromise
    return await this._setSession(currentSession)
  }

  protected async _setSession(currentSession: {
    access_token: string
    refresh_token: string
  }): Promise<AuthResponse> {
    try {
      if (!currentSession.access_token || !currentSession.refresh_token) {
        throw new AuthSessionMissingError()
      }

      const timeNow = Date.now() / 1000
      let expiresAt = timeNow
      let hasExpired = true
      let session: AccessTokenResponse | null = null
      const { payload } = decodeJWT(currentSession.access_token)
      if (payload.exp) {
        expiresAt = payload.exp
        hasExpired = expiresAt <= timeNow
      }

      if (hasExpired) {
        const { data: refreshedSession, error } = await this._callRefreshToken(
          currentSession.refresh_token
        )
        if (error) {
          return this._returnResult({ data: { user: null, session: null }, error: error })
        }

        if (!refreshedSession) {
          return { data: { user: null, session: null }, error: null }
        }
        session = refreshedSession
      } else {
        const { data, error } = await this._getUser(currentSession.access_token)
        if (error) {
          return this._returnResult({ data: { user: null, session: null }, error })
        }
        session = {
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
          user: data.user,
          token_type: 'bearer',
          expires_in: expiresAt - timeNow,
          expires_at: expiresAt
        }
        await this._saveSession(session)
        await this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return this._returnResult({ data: { user: session.user ?? null, session }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { session: null, user: null }, error })
      }

      throw error
    }
  }

  async refreshSession(currentSession?: { refresh_token: string }): Promise<AuthResponse> {
    await this.initializePromise
    return await this._refreshSession(currentSession)
  }

  protected async _refreshSession(currentSession?: {
    refresh_token: string
  }): Promise<AuthResponse> {
    try {
      return await this._useSession(async (result) => {
        if (!currentSession) {
          const { data, error } = result
          if (error) {
            throw error
          }

          currentSession = data.session ?? undefined
        }

        if (!currentSession?.refresh_token) {
          throw new AuthSessionMissingError()
        }

        const { data: session, error } = await this._callRefreshToken(currentSession.refresh_token)
        if (error) {
          return this._returnResult({ data: { user: null, session: null }, error: error })
        }

        if (!session) {
          return this._returnResult({ data: { user: null, session: null }, error: null })
        }

        return this._returnResult({ data: { user: session.user ?? null, session }, error: null })
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { user: null, session: null }, error })
      }

      throw error
    }
  }

  /**
   * Gets the session data from a URL string
   */
  private async _getSessionFromURL(
    params: { [parameter: string]: string },
    callbackUrlType: string
  ): Promise<
    | {
        data: { session: AccessTokenResponse; redirectType: string | null }
        error: null
      }
    | { data: { session: null; redirectType: null }; error: AuthError }
  > {
    try {
      if (!isBrowser()) throw new AuthImplicitGrantRedirectError('No browser detected.')

      // If there's an error in the URL, it doesn't matter what flow it is, we just return the error.
      if (params.error || params.error_description || params.error_code) {
        // The error class returned implies that the redirect is from an implicit grant flow
        // but it could also be from a redirect error from a PKCE flow.
        throw new AuthImplicitGrantRedirectError(
          params.error_description || 'Error in URL with unspecified error_description',
          {
            error: params.error || 'unspecified_error',
            code: params.error_code || 'unspecified_code'
          }
        )
      }

      // Checks for mismatches between the flowType initialised in the client and the URL parameters
      switch (callbackUrlType) {
        case 'implicit':
          if (this.flowType === 'pkce') {
            throw new AuthPKCEGrantCodeExchangeError('Not a valid PKCE flow url.')
          }
          break
        case 'pkce':
          if (this.flowType === 'implicit') {
            throw new AuthImplicitGrantRedirectError('Not a valid implicit grant flow url.')
          }
          break
        default:
        // there's no mismatch so we continue
      }

      // Since this is a redirect for PKCE, we attempt to retrieve the code from the URL for the code exchange
      if (callbackUrlType === 'pkce') {
        this._debug('#_initialize()', 'begin', 'is PKCE flow', true)
        if (!params.code) throw new AuthPKCEGrantCodeExchangeError('No code detected.')
        const { data, error } = await this._exchangeCodeForSession(params.code)
        if (error) throw error

        const url = new URL(window.location.href)
        url.searchParams.delete('code')

        window.history.replaceState(window.history.state, '', url.toString())

        return {
          data: { session: data.session, redirectType: data.redirectType ?? null },
          error: null
        }
      }

      const {
        provider_token,
        provider_refresh_token,
        access_token,
        refresh_token,
        expires_in,
        expires_at,
        token_type
      } = params

      if (!access_token || !expires_in || !refresh_token || !token_type) {
        throw new AuthImplicitGrantRedirectError('No session defined in URL')
      }

      const timeNow = Math.round(Date.now() / 1000)
      const expiresIn = parseInt(expires_in)
      let expiresAt = timeNow + expiresIn

      if (expires_at) {
        expiresAt = parseInt(expires_at)
      }

      const actuallyExpiresIn = expiresAt - timeNow
      if (actuallyExpiresIn * 1000 <= AUTO_REFRESH_TICK_DURATION_MS) {
        console.warn(
          `@supabase/gotrue-js: Session as retrieved from URL expires in ${actuallyExpiresIn}s, should have been closer to ${expiresIn}s`
        )
      }

      const issuedAt = expiresAt - expiresIn
      if (timeNow - issuedAt >= 120) {
        console.warn(
          '@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale',
          issuedAt,
          expiresAt,
          timeNow
        )
      } else if (timeNow - issuedAt < 0) {
        console.warn(
          '@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew',
          issuedAt,
          expiresAt,
          timeNow
        )
      }

      const { data, error } = await this._getUser(access_token)
      if (error) throw error

      const session: AccessTokenResponse = {
        provider_token,
        provider_refresh_token,
        access_token,
        expires_in: expiresIn,
        expires_at: expiresAt,
        refresh_token,
        token_type: token_type as 'bearer',
        user: data.user
      }

      // Remove tokens from URL
      window.location.hash = ''
      this._debug('#_getSessionFromURL()', 'clearing window.location.hash')

      return this._returnResult({ data: { session, redirectType: params.type }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { session: null, redirectType: null }, error })
      }

      throw error
    }
  }

  /**
   * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
   *
   * If `detectSessionInUrl` is a function, it will be called with the URL and params to determine
   * if the URL should be processed as a Supabase auth callback. This allows users to exclude
   * URLs from other OAuth providers (e.g., Facebook Login) that also return access_token in the fragment.
   */
  private _isImplicitGrantCallback(params: { [parameter: string]: string }): boolean {
    if (typeof this.detectSessionInUrl === 'function') {
      return this.detectSessionInUrl(new URL(window.location.href), params)
    }
    return Boolean(
      params.access_token || params.error || params.error_description || params.error_code
    )
  }

  /**
   * Checks if the current URL and backing storage contain parameters given by a PKCE flow
   */
  private async _isPKCECallback(params: { [parameter: string]: string }): Promise<boolean> {
    const currentStorageContent = await getItemAsync(
      this.storage,
      `${this.storageKey}-code-verifier`
    )

    return !!(params.code && currentStorageContent)
  }

  async signOut(options: SignOut = { target: 'global' }): Promise<{ error: AuthError | null }> {
    await this.initializePromise

    if (this.lock != null) {
      // TODO(v3): remove legacy lock path
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._signOut(options)
      })
    }

    return await this._signOut(options)
  }

  protected async _signOut(
    { target }: SignOut = { target: 'global' }
  ): Promise<{ error: AuthError | null }> {
    return await this._useSession(async (result) => {
      const { data, error: sessionError } = result
      if (sessionError && !isAuthSessionMissingError(sessionError)) {
        return this._returnResult({ error: sessionError })
      }
      const accessToken = data.session?.access_token
      if (accessToken) {
        const { error } = await this.adminSignOut(accessToken, target)
        if (error) {
          // ignore 404s since user might not exist anymore
          // ignore 401s since an invalid or expired JWT should sign out the current session
          if (!(
            (isAuthApiError(error) &&
              (error.status === 404 || error.status === 401 || error.status === 403)) ||
            isAuthSessionMissingError(error)
          )) {
            return this._returnResult({ error })
          }
        }
      }
      if (target !== 'others') {
        await this._removeSession()
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      }
      return this._returnResult({ error: null })
    })
  }

  /**
   * Removes a logged-in session.
   * @param jwt A valid, logged-in JWT.
   * @param scope The logout sope.
   *
   * @category Auth
   * @subcategory Auth Admin
   */
  async adminSignOut(
    jwt: string,
    scope: SignOutScope = SIGN_OUT_SCOPES[0]
  ): Promise<{ data: null; error: AuthError | null }> {
    if (SIGN_OUT_SCOPES.indexOf(scope) < 0) {
      throw new Error(
        `@supabase/auth-js: Parameter scope must be one of ${SIGN_OUT_SCOPES.join(', ')}`
      )
    }

    try {
      await _request(this.fetch, 'POST', `${this.url}/logout?scope=${scope}`, {
        headers: this.headers,
        jwt,
        noResolveJson: true
      })
      return { data: null, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Receive a notification every time an auth event happens.
   * Safe to use without an async function as callback.
   *
   * @param callback A callback function to be invoked when an auth event happens.
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: AccessTokenResponse | null) => void
  ): {
    data: { subscription: Subscription }
  }

  /**
   * Receive a notification every time an auth event happens. Common reentry
   * patterns (`getUser`, `setSession`, reading the session from inside a
   * handler) complete normally. One hazard remains: calling `refreshSession`
   * (or anything that routes through `_callRefreshToken`) from inside a
   * `TOKEN_REFRESHED` handler. `refreshingDeferred` resolves only after
   * `_notifyAllSubscribers` returns, so the inner refresh dedupes onto the
   * outer's unresolved promise and the two wait on each other.
   *
   * @param callback A callback function to be invoked when an auth event happens.
   *
   * @deprecated Async callbacks can deadlock when they trigger a nested
   * refresh from a `TOKEN_REFRESHED` event. Prefer the sync overload, or move
   * refresh-triggering work outside the callback.
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: AccessTokenResponse | null) => Promise<void>
  ): {
    data: { subscription: Subscription }
  }

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: AccessTokenResponse | null) => void | Promise<void>
  ): {
    data: { subscription: Subscription }
  } {
    const id: string | symbol = generateCallbackId()
    const subscription: Subscription = {
      id,
      callback,
      unsubscribe: () => {
        this._debug('#unsubscribe()', 'state change callback with id removed', id)

        this.stateChangeEmitters.delete(id)
      }
    }

    this._debug('#onAuthStateChange()', 'registered callback with id', id)

    this.stateChangeEmitters.set(id, subscription)
    ;(async () => {
      await this.initializePromise

      if (this.lock != null) {
        // TODO(v3): remove legacy lock path
        await this._acquireLock(this.lockAcquireTimeout, async () => {
          this._emitInitialSession(id)
        })
      } else {
        await this._emitInitialSession(id)
      }
    })()

    return { data: { subscription } }
  }

  private async _emitInitialSession(id: string | symbol): Promise<void> {
    return await this._useSession(async (result) => {
      try {
        const {
          data: { session },
          error
        } = result
        if (error) throw error

        await this.stateChangeEmitters.get(id)?.callback('INITIAL_SESSION', session)
        this._debug('INITIAL_SESSION', 'callback id', id, 'session', session)
      } catch (err) {
        await this.stateChangeEmitters.get(id)?.callback('INITIAL_SESSION', null)
        this._debug('INITIAL_SESSION', 'callback id', id, 'error', err)
        if (isAuthSessionMissingError(err)) {
          console.warn(err)
        } else {
          console.error(err)
        }
      }
    })
  }

  async getUserIdentities(): Promise<
    | {
        data: {
          identities: PublicIdentity[]
        }
        error: null
      }
    | { data: null; error: AuthError }
  > {
    try {
      const { data, error } = await this.getUser()
      if (error) throw error
      return this._returnResult({ data: { identities: data.user.identities ?? [] }, error: null })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: null, error })
      }
      throw error
    }
  }

  /**
   * Links an oauth identity to an existing user.
   * This method supports the PKCE flow.
   */
  async linkIdentity(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse>

  /**
   * Links an OIDC identity to an existing user.
   */
  async linkIdentity(credentials: SignInWithIdTokenCredentials): Promise<AuthTokenResponse>

  /**  *
   * @category Auth
   *
   * @remarks
   * - The **Enable Manual Linking** option must be enabled from your [project's authentication settings](/dashboard/project/_/auth/providers).
   * - The user needs to be signed in to call `linkIdentity()`.
   * - If the candidate identity is already linked to the existing user or another user, `linkIdentity()` will fail.
   * - If `linkIdentity` is run in the browser, the user is automatically redirected to the returned URL. On the server, you should handle the redirect.
   *
   * @example Link an identity to a user
   * ```js
   * const { data, error } = await supabase.auth.linkIdentity({
   *   provider: 'github'
   * })
   * ```
   *
   * @exampleResponse Link an identity to a user
   * ```json
   * {
   *   data: {
   *     provider: 'github',
   *     url: <PROVIDER_URL_TO_REDIRECT_TO>
   *   },
   *   error: null
   * }
   * ```
   */
  async linkIdentity(credentials: any): Promise<any> {
    if ('token' in credentials) {
      return this.linkIdentityIdToken(credentials)
    }

    return this.linkIdentityOAuth(credentials)
  }

  private async linkIdentityOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse> {
    try {
      const { data, error } = await this._useSession(async (result) => {
        const { data, error } = result
        if (error) throw error
        const url: string = await this._getUrlForProvider(
          `${this.url}/user/identities/authorize`,
          credentials.provider,
          {
            redirectTo: credentials.options?.redirectTo,
            scopes: credentials.options?.scopes,
            queryParams: credentials.options?.queryParams,
            skipBrowserRedirect: true
          }
        )
        return await _request(this.fetch, 'GET', url, {
          headers: this.headers,
          jwt: data.session?.access_token ?? undefined
        })
      })
      if (error) throw error
      if (isBrowser() && !credentials.options?.skipBrowserRedirect) {
        window.location.assign(data?.url)
      }
      return this._returnResult({
        data: { provider: credentials.provider, url: data?.url },
        error: null
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { provider: credentials.provider, url: null }, error })
      }
      throw error
    }
  }

  private async linkIdentityIdToken(
    credentials: SignInWithIdTokenCredentials
  ): Promise<AuthTokenResponse> {
    return await this._useSession(async (result) => {
      try {
        const {
          error: sessionError,
          data: { session }
        } = result
        if (sessionError) throw sessionError

        const { options, provider, token, access_token, nonce } = credentials

        const res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=id_token`, {
          headers: this.headers,
          jwt: session?.access_token ?? undefined,
          body: {
            provider,
            id_token: token,
            access_token,
            nonce,
            link_identity: true,
            gotrue_meta_security: { captcha_token: options?.captchaToken }
          },
          xform: _sessionResponse
        })

        const { data, error } = res
        if (error) {
          return this._returnResult({ data: { user: null, session: null }, error })
        } else if (!data || !data.session || !data.user) {
          return this._returnResult({
            data: { user: null, session: null },
            error: new AuthInvalidTokenResponseError()
          })
        }
        if (data.session) {
          await this._saveSession(data.session)
          await this._notifyAllSubscribers('USER_UPDATED', data.session)
        }
        return this._returnResult({ data, error })
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error })
        }
        throw error
      }
    })
  }

  async unlinkIdentity(identity: PublicIdentity): Promise<
    | {
        data: {}
        error: null
      }
    | { data: null; error: AuthError }
  > {
    try {
      return await this._useSession(async (result) => {
        const { data, error } = result
        if (error) {
          throw error
        }
        return await _request(this.fetch, 'DELETE', `${this.url}/user/identities/${identity.id}`, {
          headers: this.headers,
          jwt: data.session?.access_token ?? undefined
        })
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: null, error })
      }
      throw error
    }
  }

  /**
   * Generates a new JWT.
   * @param refreshToken A valid refresh token that was returned on login.
   */
  private async _refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    // Refresh tokens are long-lived bearer credentials; do NOT include any
    // fragment of the token in the debug tag, even when `debug: true` is
    // enabled (logs may be forwarded to third-party services).
    const debugName = `#_refreshAccessToken()`
    this._debug(debugName, 'begin')

    try {
      const startedAt = Date.now()

      // will attempt to refresh the token with exponential backoff
      return await retryable(
        async (attempt) => {
          if (attempt > 0) {
            await sleep(200 * Math.pow(2, attempt - 1)) // 200, 400, 800, ...
          }

          this._debug(debugName, 'refreshing attempt', attempt)

          return await _request(this.fetch, 'POST', `${this.url}/token?grant_type=refresh_token`, {
            body: { refresh_token: refreshToken },
            headers: this.headers,
            xform: _sessionResponse
          })
        },
        (attempt, error) => {
          const nextBackOffInterval = 200 * Math.pow(2, attempt)
          return (
            error &&
            isAuthRetryableFetchError(error) &&
            // retryable only if the request can be sent before the backoff overflows the tick duration
            Date.now() + nextBackOffInterval - startedAt < AUTO_REFRESH_TICK_DURATION_MS
          )
        }
      )
    } catch (error) {
      this._debug(debugName, 'error', error)

      if (isAuthError(error)) {
        return this._returnResult({ data: { session: null, user: null }, error })
      }
      throw error
    } finally {
      this._debug(debugName, 'end')
    }
  }

  private _isValidSession(maybeSession: unknown): maybeSession is AccessTokenResponse {
    const isValidSession =
      typeof maybeSession === 'object' &&
      maybeSession !== null &&
      'access_token' in maybeSession &&
      'refresh_token' in maybeSession &&
      'expires_at' in maybeSession

    return isValidSession
  }

  private async _handleProviderSignIn(
    provider: Provider,
    options: {
      redirectTo?: string
      scopes?: string
      queryParams?: { [key: string]: string }
      skipBrowserRedirect?: boolean
    }
  ) {
    const url: string = await this._getUrlForProvider(`${this.url}/authorize`, provider, {
      redirectTo: options.redirectTo,
      scopes: options.scopes,
      queryParams: options.queryParams
    })

    this._debug('#_handleProviderSignIn()', 'provider', provider, 'options', options, 'url', url)

    // try to open on the browser
    if (isBrowser() && !options.skipBrowserRedirect) {
      window.location.assign(url)
    }

    return { data: { provider, url }, error: null }
  }

  /**
   * Recovers the session from LocalStorage and refreshes the token
   * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
   */
  private async _recoverAndRefresh() {
    const debugName = '#_recoverAndRefresh()'
    this._debug(debugName, 'begin')

    try {
      const currentSession = (await getItemAsync(
        this.storage,
        this.storageKey
      )) as AccessTokenResponse | null

      if (currentSession && this.userStorage) {
        let maybeUser: { user: PublicUser | null } | null = (await getItemAsync(
          this.userStorage,
          this.storageKey + '-user'
        )) as any

        if (!this.storage.isServer && Object.is(this.storage, this.userStorage) && !maybeUser) {
          // storage and userStorage are the same storage medium, for example
          // window.localStorage if userStorage does not have the user from
          // storage stored, store it first thereby migrating the user object
          // from storage -> userStorage

          maybeUser = { user: currentSession.user ?? null }
          await setItemAsync(this.userStorage, this.storageKey + '-user', maybeUser)
        }

        currentSession.user = maybeUser?.user ?? userNotAvailableProxy()
      } else if (currentSession && !currentSession.user) {
        // user storage is not set, let's check if it was previously enabled so
        // we bring back the storage as it should be

        if (!currentSession.user) {
          // test if userStorage was previously enabled and the storage medium was the same, to move the user back under the same key
          const separateUser: { user: PublicUser | null } | null = (await getItemAsync(
            this.storage,
            this.storageKey + '-user'
          )) as any

          if (separateUser && separateUser?.user) {
            currentSession.user = separateUser.user

            await removeItemAsync(this.storage, this.storageKey + '-user')
            await setItemAsync(this.storage, this.storageKey, currentSession)
          } else {
            currentSession.user = userNotAvailableProxy()
          }
        }
      }

      this._debug(debugName, 'session from storage', currentSession)

      if (!this._isValidSession(currentSession)) {
        this._debug(debugName, 'session is not valid')
        if (currentSession !== null) {
          await this._removeSession()
        }

        return
      }

      const expiresWithMargin =
        (currentSession.expires_at ?? Infinity) * 1000 - Date.now() < EXPIRY_MARGIN_MS

      this._debug(
        debugName,
        `session has${expiresWithMargin ? '' : ' not'} expired with margin of ${EXPIRY_MARGIN_MS}s`
      )

      if (expiresWithMargin) {
        if (this.autoRefreshToken && currentSession.refresh_token) {
          const { error } = await this._callRefreshToken(currentSession.refresh_token)

          if (error) {
            // `_callRefreshToken` is the single source of truth for refresh
            // outcomes: it removes the session itself when the access token
            // is actually expired, and preserves it when the token is still
            // valid (proactive-preserve). Don't second-guess that here — a
            // local `_removeSession` would emit a duplicate `SIGNED_OUT` on
            // genuine failures and undo the proactive-preserve at init time.
            if (isAuthRefreshDiscardedError(error)) {
              this._debug(debugName, 'refresh discarded by commit guard', error)
            } else {
              this._debug(debugName, 'refresh failed', error)
            }
          }
        }
      } else if (
        currentSession.user &&
        (currentSession.user as any).__isUserNotAvailableProxy === true
      ) {
        // If we have a proxy user, try to get the real user data
        try {
          const { data, error: userError } = await this._getUser(currentSession.access_token)

          if (!userError && data?.user) {
            currentSession.user = data.user
            await this._saveSession(currentSession)
            await this._notifyAllSubscribers('SIGNED_IN', currentSession)
          } else {
            this._debug(debugName, 'could not get user data, skipping SIGNED_IN notification')
          }
        } catch (getUserError) {
          console.error('Error getting user data:', getUserError)
          this._debug(
            debugName,
            'error getting user data, skipping SIGNED_IN notification',
            getUserError
          )
        }
      } else {
        // no need to persist currentSession again, as we just loaded it from
        // local storage; persisting it again may overwrite a value saved by
        // another client with access to the same local storage
        await this._notifyAllSubscribers('SIGNED_IN', currentSession)
      }
    } catch (err) {
      this._debug(debugName, 'error', err)

      console.error(err)
      return
    } finally {
      this._debug(debugName, 'end')
    }
  }

  private async _callRefreshToken(refreshToken: string): Promise<CallRefreshTokenResult> {
    if (!refreshToken) {
      throw new AuthSessionMissingError()
    }

    // refreshing is already in progress
    if (this.refreshingDeferred) {
      return this.refreshingDeferred.promise
    }

    // Serial failure cooldown: callers passing the *same* refresh token
    // after a recent failure receive the cached result instead of firing
    // another `/token` request. This caps the proactive-refresh storm
    // where every `getSession()` call inside the 90s EXPIRY_MARGIN_MS
    // window kept re-firing against the same broken refresh token during
    // outages. Concurrent callers already share `refreshingDeferred`; this
    // cache covers serial callers spaced across cooldown windows.
    //
    // Token-keyed so callers with a fresh refresh token (rotation pickup
    // from another tab, explicit `setSession`/`refreshSession({ refresh_token })`,
    // multi-account switch) bypass the cache and attempt a real refresh.
    if (
      this.lastRefreshFailure &&
      this.lastRefreshFailure.refreshToken === refreshToken &&
      Date.now() < this.lastRefreshFailure.expiresAt
    ) {
      this._debug('#_callRefreshToken()', 'returning cached failure (cooldown active)')
      return this.lastRefreshFailure.result
    }

    // Refresh tokens are long-lived bearer credentials; do NOT include any
    // fragment of the token in the debug tag, even when `debug: true` is
    // enabled (logs may be forwarded to third-party services).
    const debugName = `#_callRefreshToken()`

    this._debug(debugName, 'begin')

    try {
      this.refreshingDeferred = new Deferred<CallRefreshTokenResult>()

      // Snapshot storage before the fetch. The commit guard discards the
      // rotated tokens only when a non-null pre-fetch snapshot changed under
      // us — typical case: a concurrent `signOut` ran `_removeSession`, or
      // another tab's refresh rewrote the slot. Callers passing
      // externally-sourced tokens (SSR cookie handoff, multi-account
      // switching, `setSession`/`refreshSession({ refresh_token })`) may
      // start from a null snapshot OR from a non-null snapshot whose
      // refresh_token differs from the one they're hydrating; in both
      // cases the guard fires only when storage was *modified between
      // snapshots*, not when the input token disagrees with what's stored.
      const storedAtStart = (await getItemAsync(
        this.storage,
        this.storageKey
      )) as AccessTokenResponse | null

      const { data, error } = await this._refreshAccessToken(refreshToken)
      if (error) throw error
      if (!data.session) throw new AuthSessionMissingError()

      const storedAfter = (await getItemAsync(
        this.storage,
        this.storageKey
      )) as AccessTokenResponse | null
      const storageChangedUnderUs =
        storedAtStart !== null &&
        (storedAfter === null || storedAfter.refresh_token !== storedAtStart.refresh_token)

      if (storageChangedUnderUs) {
        this._debug(
          debugName,
          'commit guard: storage changed since refresh started, discarding rotated tokens',
          {
            // Presence indicators only — never log refresh token fragments,
            // even partial. Logs may be forwarded to third-party services.
            startedWith: 'present',
            nowHolds: storedAfter ? 'replaced' : 'cleared'
          }
        )
        const discarded: CallRefreshTokenResult = {
          data: null,
          error: new AuthRefreshDiscardedError()
        }
        this.refreshingDeferred.resolve(discarded)
        return discarded
      }

      // Second leg of the commit guard: close the TOCTOU window between the
      // synchronous `storageChangedUnderUs` check and the actual storage
      // writes inside `_saveSession`. A concurrent `signOut → _removeSession`
      // can land inside `_saveSession`'s `await setItemAsync(...)` yields and
      // clear storage just before we overwrite it. Capture the epoch BEFORE
      // the save and re-check after; if it advanced, undo the write directly
      // (do NOT call `_removeSession` — that would emit a duplicate
      // SIGNED_OUT for the concurrent signOut that already fired one).
      const epochBeforeSave = this._sessionRemovalEpoch

      await this._saveSession(data.session)

      if (this._sessionRemovalEpoch !== epochBeforeSave) {
        this._debug(
          debugName,
          'commit guard (post-save): _removeSession ran during _saveSession, undoing write'
        )
        await removeItemAsync(this.storage, this.storageKey)
        if (this.userStorage) {
          await removeItemAsync(this.userStorage, this.storageKey + '-user')
        }
        const discarded: CallRefreshTokenResult = {
          data: null,
          error: new AuthRefreshDiscardedError()
        }
        this.refreshingDeferred.resolve(discarded)
        return discarded
      }

      await this._notifyAllSubscribers('TOKEN_REFRESHED', data.session)

      const result = { data: data.session, error: null }

      // Refresh succeeded — clear any cached failure so the next caller
      // (including the auto-refresh ticker) attempts a real refresh again.
      this.lastRefreshFailure = null

      this.refreshingDeferred.resolve(result)

      return result
    } catch (error) {
      this._debug(debugName, 'error', error)

      if (isAuthError(error)) {
        const result = { data: null, error }

        if (!isAuthRetryableFetchError(error)) {
          // Proactive vs reactive distinction: a refresh fires whenever
          // the access token is within EXPIRY_MARGIN_MS of expiry. If the
          // access token is *still valid* at this moment, the refresh was
          // proactive and the existing session is still usable until its
          // real expiry — destroying it now would log out a user whose
          // access token works. If the access token has actually expired,
          // the refresh token is the only credential left and it just got
          // rejected — the session is genuinely dead. `__loadSession`
          // mirrors this distinction on the read path so callers see the
          // preserved session instead of `session: null`.
          const storedNow = (await getItemAsync(
            this.storage,
            this.storageKey
          )) as AccessTokenResponse | null
          const accessTokenStillValid = !!(
            storedNow?.expires_at && storedNow.expires_at * 1000 > Date.now()
          )

          if (accessTokenStillValid) {
            this._debug(
              debugName,
              'proactive refresh failed, access token still valid — preserving session'
            )
          } else {
            await this._removeSession()
          }
        }

        // Cache the failure so serial callers (and the next auto-refresh
        // tick) passing the same refresh token within the cooldown window
        // receive it synchronously instead of firing another `/token`
        // call. Set after the optional `_removeSession` above (which
        // clears the cache as part of teardown) so the cache survives.
        this.lastRefreshFailure = {
          refreshToken,
          result,
          expiresAt: Date.now() + REFRESH_FAILURE_COOLDOWN_MS
        }

        this.refreshingDeferred?.resolve(result)

        return result
      }

      this.refreshingDeferred?.reject(error)
      throw error
    } finally {
      this.refreshingDeferred = null
      this._debug(debugName, 'end')
    }
  }

  private async _notifyAllSubscribers(
    event: AuthChangeEvent,
    session: AccessTokenResponse | null,
    broadcast = true
  ) {
    const debugName = `#_notifyAllSubscribers(${event})`
    this._debug(debugName, 'begin', session, `broadcast = ${broadcast}`)

    try {
      if (this.broadcastChannel && broadcast) {
        this.broadcastChannel.postMessage({ event, session })
      }

      const errors: unknown[] = []
      const promises = Array.from(this.stateChangeEmitters.values()).map(async (x) => {
        try {
          await x.callback(event, session)
        } catch (e) {
          errors.push(e)
        }
      })

      await Promise.all(promises)

      if (errors.length > 0) {
        for (let i = 0; i < errors.length; i += 1) {
          console.error(errors[i])
        }

        throw errors[0]
      }
    } finally {
      this._debug(debugName, 'end')
    }
  }

  /**
   * set currentSession and currentUser
   * process to _startAutoRefreshToken if possible
   */
  private async _saveSession(session: AccessTokenResponse) {
    this._debug('#_saveSession()', session)
    // _saveSession is always called whenever a new session has been acquired
    // so we can safely suppress the warning returned by future getSession calls
    this.suppressGetSessionWarning = true
    await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
    // Create a shallow copy to work with, to avoid mutating the original session object if it's used elsewhere
    const sessionToProcess = { ...session }

    const userIsProxy =
      sessionToProcess.user && (sessionToProcess.user as any).__isUserNotAvailableProxy === true
    if (this.userStorage) {
      if (!userIsProxy && sessionToProcess.user) {
        // If it's a real user object, save it to userStorage.
        await setItemAsync(this.userStorage, this.storageKey + '-user', {
          user: sessionToProcess.user
        })
      } else if (userIsProxy) {
        // If it's the proxy, it means user was not found in userStorage.
        // We should ensure no stale user data for this key exists in userStorage if we were to save null,
        // or simply not save the proxy. For now, we don't save the proxy here.
        // If there's a need to clear userStorage if user becomes proxy, that logic would go here.
      }

      // Prepare the main session data for primary storage: remove the user property before cloning
      // This is important because the original session.user might be the proxy
      const mainSessionData: Omit<AccessTokenResponse, 'user'> & { user?: PublicUser } = {
        ...sessionToProcess
      }
      delete mainSessionData.user // Remove user (real or proxy) before cloning for main storage

      const clonedMainSessionData = deepClone(mainSessionData)
      await setItemAsync(this.storage, this.storageKey, clonedMainSessionData)
    } else {
      // No userStorage is configured.
      // In this case, session.user should ideally not be a proxy.
      // If it were, structuredClone would fail. This implies an issue elsewhere if user is a proxy here
      const clonedSession = deepClone(sessionToProcess) // sessionToProcess still has its original user property
      await setItemAsync(this.storage, this.storageKey, clonedSession)
    }
  }

  private async _removeSession() {
    // Bump synchronously, BEFORE any `await`, so that `_callRefreshToken`'s
    // post-save check sees the increment whenever this method has started —
    // even if it hasn't finished. Pairs with the epoch check in
    // `_callRefreshToken`. See `_sessionRemovalEpoch` field doc.
    this._sessionRemovalEpoch += 1
    this._debug('#_removeSession()')

    // The session is gone — no point holding on to a cached refresh failure
    // for a token that no longer exists. Synchronous, before any `await`.
    this.lastRefreshFailure = null

    this.suppressGetSessionWarning = false

    await removeItemAsync(this.storage, this.storageKey)
    await removeItemAsync(this.storage, this.storageKey + '-code-verifier')
    await removeItemAsync(this.storage, this.storageKey + '-user')

    if (this.userStorage) {
      await removeItemAsync(this.userStorage, this.storageKey + '-user')
    }

    await this._notifyAllSubscribers('SIGNED_OUT', null)
  }

  /**
   * Removes any registered visibilitychange callback.
   *
   */
  private _removeVisibilityChangedCallback() {
    this._debug('#_removeVisibilityChangedCallback()')

    const callback = this.visibilityChangedCallback
    this.visibilityChangedCallback = null

    try {
      if (callback && isBrowser() && window?.removeEventListener) {
        window.removeEventListener('visibilitychange', callback)
      }
    } catch (e) {
      console.error('removing visibilitychange callback failed', e)
    }
  }

  /**
   * This is the private implementation of {@link #startAutoRefresh}. Use this
   * within the library.
   */
  private async _startAutoRefresh() {
    await this._stopAutoRefresh()

    this._debug('#_startAutoRefresh()')

    const ticker = setInterval(() => this._autoRefreshTokenTick(), AUTO_REFRESH_TICK_DURATION_MS)
    this.autoRefreshTicker = ticker

    if (ticker && typeof ticker === 'object' && typeof ticker.unref === 'function') {
      // ticker is a NodeJS Timeout object that has an `unref` method
      // https://nodejs.org/api/timers.html#timeoutunref
      // When auto refresh is used in NodeJS (like for testing) the
      // `setInterval` is preventing the process from being marked as
      // finished and tests run endlessly. This can be prevented by calling
      // `unref()` on the returned object.
      ticker.unref()
      // @ts-expect-error TS has no context of Deno
    } else if (typeof Deno !== 'undefined' && typeof Deno.unrefTimer === 'function') {
      // similar like for NodeJS, but with the Deno API
      // https://deno.land/api@latest?unstable&s=Deno.unrefTimer
      // @ts-expect-error TS has no context of Deno
      Deno.unrefTimer(ticker)
    }

    // run the tick immediately, but in the next pass of the event loop so that
    // #_initialize can be allowed to complete without recursively waiting on
    // itself
    const timeout = setTimeout(async () => {
      await this.initializePromise
      await this._autoRefreshTokenTick()
    }, 0)
    this.autoRefreshTickTimeout = timeout

    if (timeout && typeof timeout === 'object' && typeof timeout.unref === 'function') {
      timeout.unref()
      // @ts-expect-error TS has no context of Deno
    } else if (typeof Deno !== 'undefined' && typeof Deno.unrefTimer === 'function') {
      // @ts-expect-error TS has no context of Deno
      Deno.unrefTimer(timeout)
    }
  }

  /**
   * This is the private implementation of {@link #stopAutoRefresh}. Use this
   * within the library.
   */
  private async _stopAutoRefresh() {
    this._debug('#_stopAutoRefresh()')

    const ticker = this.autoRefreshTicker
    this.autoRefreshTicker = null

    if (ticker) {
      clearInterval(ticker)
    }

    const timeout = this.autoRefreshTickTimeout
    this.autoRefreshTickTimeout = null

    if (timeout) {
      clearTimeout(timeout)
    }
  }

  async startAutoRefresh() {
    this._removeVisibilityChangedCallback()
    await this._startAutoRefresh()
  }

  async stopAutoRefresh() {
    this._removeVisibilityChangedCallback()
    await this._stopAutoRefresh()
  }

  async dispose(): Promise<void> {
    this._removeVisibilityChangedCallback()
    await this._stopAutoRefresh()
    this.broadcastChannel?.close()
    this.broadcastChannel = null
    this.stateChangeEmitters.clear()
  }

  /**
   * Runs the auto refresh token tick.
   */
  private async _autoRefreshTokenTick() {
    this._debug('#_autoRefreshTokenTick()', 'begin')

    if (this.lock != null) {
      // TODO(v3): remove legacy lock path. Uses `_acquireLock(0, ...)` which
      // throws `LockAcquireTimeoutError` immediately if the lock is held —
      // that's the fail-fast skip path that lets the tick bail out instead
      // of queuing behind a long-running operation.
      try {
        await this._acquireLock(0, async () => {
          try {
            const now = Date.now()
            try {
              return await this._useSession(async (result) => {
                const {
                  data: { session }
                } = result

                if (!session || !session.refresh_token || !session.expires_at) {
                  this._debug('#_autoRefreshTokenTick()', 'no session')
                  return
                }

                const expiresInTicks = Math.floor(
                  (session.expires_at * 1000 - now) / AUTO_REFRESH_TICK_DURATION_MS
                )

                this._debug(
                  '#_autoRefreshTokenTick()',
                  `access token expires in ${expiresInTicks} ticks, a tick lasts ${AUTO_REFRESH_TICK_DURATION_MS}ms, refresh threshold is ${AUTO_REFRESH_TICK_THRESHOLD} ticks`
                )

                if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
                  await this._callRefreshToken(session.refresh_token)
                }
              })
            } catch (e) {
              console.error(
                'Auto refresh tick failed with error. This is likely a transient error.',
                e
              )
            }
          } finally {
            this._debug('#_autoRefreshTokenTick()', 'end')
          }
        })
      } catch (e) {
        if (e instanceof LockAcquireTimeoutError) {
          this._debug('auto refresh token tick lock not available')
        } else {
          throw e
        }
      }
      return
    }

    // Lockless default: skip if a refresh is already in flight.
    // `_callRefreshToken` also dedupes via the same field; this is just a
    // fast-path skip to avoid an unnecessary storage read.
    if (this.refreshingDeferred !== null) {
      this._debug('#_autoRefreshTokenTick()', 'refresh already in flight, skipping')
      return
    }

    try {
      const now = Date.now()

      try {
        await this._useSession(async (result) => {
          const {
            data: { session }
          } = result

          if (!session || !session.refresh_token || !session.expires_at) {
            this._debug('#_autoRefreshTokenTick()', 'no session')
            return
          }

          // session will expire in this many ticks (or has already expired if <= 0)
          const expiresInTicks = Math.floor(
            (session.expires_at * 1000 - now) / AUTO_REFRESH_TICK_DURATION_MS
          )

          this._debug(
            '#_autoRefreshTokenTick()',
            `access token expires in ${expiresInTicks} ticks, a tick lasts ${AUTO_REFRESH_TICK_DURATION_MS}ms, refresh threshold is ${AUTO_REFRESH_TICK_THRESHOLD} ticks`
          )

          if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
            await this._callRefreshToken(session.refresh_token)
          }
        })
      } catch (e) {
        console.error('Auto refresh tick failed with error. This is likely a transient error.', e)
      }
    } finally {
      this._debug('#_autoRefreshTokenTick()', 'end')
    }
  }

  /**
   * Registers callbacks on the browser / platform, which in-turn run
   * algorithms when the browser window/tab are in foreground. On non-browser
   * platforms it assumes always foreground.
   */
  private async _handleVisibilityChange() {
    this._debug('#_handleVisibilityChange()')

    if (!isBrowser() || !window?.addEventListener) {
      if (this.autoRefreshToken) {
        // in non-browser environments the refresh token ticker runs always
        this.startAutoRefresh()
      }

      return false
    }

    try {
      this.visibilityChangedCallback = async () => {
        try {
          await this._onVisibilityChanged(false)
        } catch (error) {
          this._debug('#visibilityChangedCallback', 'error', error)
        }
      }

      window?.addEventListener('visibilitychange', this.visibilityChangedCallback)

      // now immediately call the visbility changed callback to setup with the
      // current visbility state
      await this._onVisibilityChanged(true) // initial call
    } catch (error) {
      console.error('_handleVisibilityChange', error)
    }
  }

  /**
   * Callback registered with `window.addEventListener('visibilitychange')`.
   */
  private async _onVisibilityChanged(calledFromInitialize: boolean) {
    const methodName = `#_onVisibilityChanged(${calledFromInitialize})`
    this._debug(methodName, 'visibilityState', document.visibilityState)

    if (document.visibilityState === 'visible') {
      if (this.autoRefreshToken) {
        // in browser environments the refresh token ticker runs only on focused tabs
        // which prevents race conditions
        this._startAutoRefresh()
      }

      if (!calledFromInitialize) {
        // called when the visibility has changed, i.e. the browser
        // transitioned from hidden -> visible so we need to see if the session
        // should be recovered
        await this.initializePromise

        if (this.lock != null) {
          // TODO(v3): remove legacy lock path
          await this._acquireLock(this.lockAcquireTimeout, async () => {
            if (document.visibilityState !== 'visible') {
              this._debug(
                methodName,
                'acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting'
              )
              return
            }
            await this._recoverAndRefresh()
          })
        } else {
          if (document.visibilityState !== 'visible') {
            this._debug(methodName, 'visibilityState is no longer visible, skipping recovery')
            return
          }
          // recover the session
          await this._recoverAndRefresh()
        }
      }
    } else if (document.visibilityState === 'hidden') {
      if (this.autoRefreshToken) {
        this._stopAutoRefresh()
      }
    }
  }

  /**
   * Generates the relevant login URL for a third-party provider.
   * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param options.scopes A space-separated list of scopes granted to the OAuth application.
   * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
   */
  private async _getUrlForProvider(
    url: string,
    provider: Provider,
    options: {
      redirectTo?: string
      scopes?: string
      queryParams?: { [key: string]: string }
      skipBrowserRedirect?: boolean
    }
  ) {
    const urlParams: string[] = [`provider=${encodeURIComponent(provider)}`]
    if (options?.redirectTo) {
      urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`)
    }
    if (options?.scopes) {
      urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`)
    }
    if (this.flowType === 'pkce') {
      const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
        this.storage,
        this.storageKey
      )

      const flowParams = new URLSearchParams({
        code_challenge: `${encodeURIComponent(codeChallenge)}`,
        code_challenge_method: `${encodeURIComponent(codeChallengeMethod)}`
      })
      urlParams.push(flowParams.toString())
    }
    if (options?.queryParams) {
      const query = new URLSearchParams(options.queryParams)
      urlParams.push(query.toString())
    }
    if (options?.skipBrowserRedirect) {
      urlParams.push(`skip_http_redirect=${options.skipBrowserRedirect}`)
    }

    return `${url}?${urlParams.join('&')}`
  }

  private async _unenroll(params: MFAUnenrollParams): Promise<AuthMFAUnenrollResponse> {
    try {
      return await this._useSession(async (result) => {
        const { data: sessionData, error: sessionError } = result
        if (sessionError) {
          return this._returnResult({ data: null, error: sessionError })
        }

        return await _request(this.fetch, 'DELETE', `${this.url}/factors/${params.factorId}`, {
          headers: this.headers,
          jwt: sessionData?.session?.access_token
        })
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: null, error })
      }
      throw error
    }
  }

  /**
   * {@see GoTrueMFAApi#enroll}
   */
  private async _enroll(params: MFAEnrollTOTPParams): Promise<AuthMFAEnrollTOTPResponse>
  private async _enroll(params: MFAEnrollPhoneParams): Promise<AuthMFAEnrollPhoneResponse>
  private async _enroll(params: MFAEnrollWebauthnParams): Promise<AuthMFAEnrollWebauthnResponse>
  private async _enroll(params: MFAEnrollParams): Promise<AuthMFAEnrollResponse> {
    try {
      return await this._useSession(async (result) => {
        const { data: sessionData, error: sessionError } = result
        if (sessionError) {
          return this._returnResult({ data: null, error: sessionError })
        }

        const body = {
          friendly_name: params.friendlyName,
          factor_type: params.factorType,
          ...(params.factorType === 'phone'
            ? { phone: params.phone }
            : params.factorType === 'totp'
              ? { issuer: params.issuer }
              : {})
        }

        const { data, error } = (await _request(this.fetch, 'POST', `${this.url}/factors`, {
          body,
          headers: this.headers,
          jwt: sessionData?.session?.access_token
        })) as AuthMFAEnrollResponse
        if (error) {
          return this._returnResult({ data: null, error })
        }

        if (params.factorType === 'totp' && data.type === 'totp' && data?.totp?.qr_code) {
          data.totp.qr_code = `data:image/svg+xml;utf-8,${data.totp.qr_code}`
        }

        return this._returnResult({ data, error: null })
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: null, error })
      }
      throw error
    }
  }

  /**
   */
  private async _verify(params: MFAVerifyTOTPParams): Promise<AuthMFAVerifyResponse>
  private async _verify(params: MFAVerifyPhoneParams): Promise<AuthMFAVerifyResponse>
  private async _verify<T extends 'create' | 'request'>(
    params: MFAVerifyWebauthnParams<T>
  ): Promise<AuthMFAVerifyResponse>
  private async _verify(params: MFAVerifyParams): Promise<AuthMFAVerifyResponse> {
    const run = async (): Promise<AuthMFAVerifyResponse> => {
      try {
        return await this._useSession(async (result) => {
          const { data: sessionData, error: sessionError } = result
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError })
          }

          const body: StrictOmit<
            | Exclude<MFAVerifyParams, MFAVerifyWebauthnParams>
            /** Exclude out the webauthn params from here because we're going to need to serialize them in the response */
            | Prettify<
                StrictOmit<MFAVerifyWebauthnParams, 'webauthn'> & {
                  webauthn: Prettify<
                    StrictOmit<MFAVerifyWebauthnParamFields['webauthn'], 'credential_response'> & {
                      credential_response: PublicKeyCredentialJSON
                    }
                  >
                }
              >,
            /*  Exclude challengeId because the backend expects snake_case, and exclude factorId since it's passed in the path params */
            'challengeId' | 'factorId'
          > & {
            challenge_id: string
          } = {
            challenge_id: params.challengeId,
            ...('webauthn' in params
              ? {
                  webauthn: {
                    ...params.webauthn,
                    credential_response:
                      params.webauthn.type === 'create'
                        ? serializeCredentialCreationResponse(
                            params.webauthn.credential_response as RegistrationCredential
                          )
                        : serializeCredentialRequestResponse(
                            params.webauthn.credential_response as AuthenticationCredential
                          )
                  }
                }
              : { code: params.code })
          }

          const { data, error } = await _request(
            this.fetch,
            'POST',
            `${this.url}/factors/${params.factorId}/verify`,
            {
              body,
              headers: this.headers,
              jwt: sessionData?.session?.access_token
            }
          )
          if (error) {
            return this._returnResult({ data: null, error })
          }

          await this._saveSession({
            expires_at: Math.round(Date.now() / 1000) + data.expires_in,
            ...data
          })
          await this._notifyAllSubscribers('MFA_CHALLENGE_VERIFIED', data)

          return this._returnResult({ data, error })
        })
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error })
        }
        throw error
      }
    }

    if (this.lock != null) {
      // TODO(v3): remove legacy lock path
      return this._acquireLock(this.lockAcquireTimeout, run)
    }
    return run()
  }

  /**
   */
  private async _challenge(
    params: MFAChallengeTOTPParams
  ): Promise<Prettify<AuthMFAChallengeTOTPResponse>>
  private async _challenge(
    params: MFAChallengePhoneParams
  ): Promise<Prettify<AuthMFAChallengePhoneResponse>>
  private async _challenge(
    params: MFAChallengeWebauthnParams
  ): Promise<Prettify<AuthMFAChallengeWebauthnResponse>>
  private async _challenge(params: MFAChallengeParams): Promise<AuthMFAChallengeResponse> {
    const run = async (): Promise<AuthMFAChallengeResponse> => {
      try {
        return await this._useSession(async (result) => {
          const { data: sessionData, error: sessionError } = result
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError })
          }

          const response = (await _request(
            this.fetch,
            'POST',
            `${this.url}/factors/${params.factorId}/challenge`,
            {
              body: params,
              headers: this.headers,
              jwt: sessionData?.session?.access_token
            }
          )) as
            | Exclude<AuthMFAChallengeResponse, AuthMFAChallengeWebauthnResponse>
            /** The server will send `serialized` data, so we assert the serialized response */
            | AuthMFAChallengeWebauthnServerResponse

          if (response.error) {
            return response
          }

          const { data } = response

          if (!data) {
            throw new AuthInvalidCredentialsError('Missing MFA challenge data')
          }

          if (data.type !== 'webauthn') {
            return { data, error: null }
          }

          const webauthnData = data as AuthMFAChallengeWebauthnResponseDataJSON

          switch (webauthnData.webauthn.type) {
            case 'create':
              return {
                data: {
                  ...webauthnData,
                  webauthn: {
                    ...webauthnData.webauthn,
                    credential_options: {
                      ...webauthnData.webauthn.credential_options,
                      publicKey: deserializeCredentialCreationOptions(
                        webauthnData.webauthn.credential_options.publicKey
                      )
                    }
                  }
                },
                error: null
              }
            case 'request':
              return {
                data: {
                  ...webauthnData,
                  webauthn: {
                    ...webauthnData.webauthn,
                    credential_options: {
                      ...webauthnData.webauthn.credential_options,
                      publicKey: deserializeCredentialRequestOptions(
                        webauthnData.webauthn.credential_options.publicKey
                      )
                    }
                  }
                },
                error: null
              }
            default:
              throw new AuthInvalidCredentialsError('Invalid WebAuthn challenge type')
          }
        })
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error })
        }
        throw error
      }
    }

    if (this.lock != null) {
      // TODO(v3): remove legacy lock path
      return this._acquireLock(this.lockAcquireTimeout, run)
    }
    return run()
  }

  /**
   */
  private async _challengeAndVerify(
    params: MFAChallengeAndVerifyParams
  ): Promise<AuthMFAVerifyResponse> {
    const { data: challengeData, error: challengeError } = await this._challenge({
      factorId: params.factorId
    })
    if (challengeError) {
      return this._returnResult({ data: null, error: challengeError })
    }

    return await this._verify({
      factorId: params.factorId,
      challengeId: challengeData?.id ?? '', // TODO: THIS CAN'T STAY LIKE THIS.
      code: params.code
    })
  }

  /**
   */
  private async _listFactors(): Promise<AuthMFAListFactorsResponse> {
    const {
      data: { user },
      error: userError
    } = await this.getUser()
    if (userError) {
      return { data: null, error: userError }
    }

    const data: AuthMFAListFactorsResponse['data'] = {
      all: [],
      phone: [],
      totp: [],
      webauthn: []
    }

    // loop over the factors ONCE
    for (const factor of user?.factors ?? []) {
      data.all.push(factor)
      if (factor.status === 'verified') {
        ;(data[factor.factor_type] as (typeof factor)[]).push(factor)
      }
    }

    return {
      data,
      error: null
    }
  }

  /**
   */
  private async _getAuthenticatorAssuranceLevel(
    jwt?: string
  ): Promise<AuthMFAGetAuthenticatorAssuranceLevelResponse> {
    if (jwt) {
      try {
        const { payload } = decodeJWT(jwt)

        let currentLevel: AuthenticatorAssuranceLevels | null = null
        if (payload.aal) {
          currentLevel = payload.aal
        }

        let nextLevel: AuthenticatorAssuranceLevels | null = currentLevel

        const {
          data: { user },
          error: userError
        } = await this.getUser(jwt)

        if (userError) {
          return this._returnResult({ data: null, error: userError })
        }

        const verifiedFactors =
          user?.factors?.filter((factor: PublicFactor) => factor.status === 'verified') ?? []

        if (verifiedFactors.length > 0) {
          nextLevel = 'aal2'
        }

        const currentAuthenticationMethods = payload.amr || []

        return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null }
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error })
        }
        throw error
      }
    }

    const {
      data: { session },
      error: sessionError
    } = await this.getSession()

    if (sessionError) {
      return this._returnResult({ data: null, error: sessionError })
    }
    if (!session) {
      return {
        data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] },
        error: null
      }
    }

    const { payload } = decodeJWT(session.access_token)

    let currentLevel: AuthenticatorAssuranceLevels | null = null

    if (payload.aal) {
      currentLevel = payload.aal
    }

    let nextLevel: AuthenticatorAssuranceLevels | null = currentLevel

    const verifiedFactors =
      session.user?.factors?.filter((factor: PublicFactor) => factor.status === 'verified') ?? []

    if (verifiedFactors.length > 0) {
      nextLevel = 'aal2'
    }

    const currentAuthenticationMethods = payload.amr || []

    return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null }
  }

  private async fetchJwk(kid: string, jwks: { keys: JWK[] } = { keys: [] }): Promise<JWK | null> {
    // try fetching from the supplied jwks
    let jwk = jwks.keys.find((key) => key.kid === kid)
    if (jwk) {
      return jwk
    }

    const now = Date.now()

    // try fetching from cache
    jwk = this.jwks.keys.find((key) => key.kid === kid)

    // jwk exists and jwks isn't stale
    if (jwk && this.jwks_cached_at + JWKS_TTL > now) {
      return jwk
    }
    // jwk isn't cached in memory so we need to fetch it from the well-known endpoint
    const { data, error } = await _request(this.fetch, 'GET', `${this.url}/.well-known/jwks.json`, {
      headers: this.headers
    })
    if (error) {
      throw error
    }
    if (!data.keys || data.keys.length === 0) {
      return null
    }

    this.jwks = data
    this.jwks_cached_at = now

    // Find the signing key
    jwk = data.keys.find((key: any) => key.kid === kid)
    if (!jwk) {
      return null
    }
    return jwk
  }

  async getClaims(
    jwt?: string,
    options: {
      /**
       * @deprecated Please use options.jwks instead.
       */
      keys?: JWK[]

      /** If set to `true` the `exp` claim will not be validated against the current time. */
      allowExpired?: boolean

      /** If set, this JSON Web Key Set is going to have precedence over the cached value available on the server. */
      jwks?: { keys: JWK[] }
    } = {}
  ): Promise<
    | {
        data: { claims: JwtPayload; header: JwtHeader; signature: Uint8Array }
        error: null
      }
    | { data: null; error: AuthError }
    | { data: null; error: null }
  > {
    try {
      let token = jwt
      if (!token) {
        const { data, error } = await this.getSession()
        if (error || !data.session) {
          return this._returnResult({ data: null, error })
        }
        token = data.session.access_token
      }

      const {
        header,
        payload,
        signature,
        raw: { header: rawHeader, payload: rawPayload }
      } = decodeJWT(token)

      if (!options?.allowExpired) {
        // Reject expired JWTs should only happen if jwt argument was passed.
        // Rethrow as AuthInvalidJwtError so the outer catch converts it to { data, error }.
        try {
          validateExp(payload.exp)
        } catch (e) {
          throw new AuthInvalidJwtError(e instanceof Error ? e.message : 'JWT validation failed')
        }
      }

      const signingKey =
        !header.alg ||
        header.alg.startsWith('HS') ||
        !header.kid ||
        !('crypto' in globalThis && 'subtle' in globalThis.crypto)
          ? null
          : await this.fetchJwk(header.kid, options?.keys ? { keys: options.keys } : options?.jwks)

      // If symmetric algorithm or WebCrypto API is unavailable, fallback to getUser()
      if (!signingKey) {
        const { error } = await this.getUser(token)
        if (error) {
          throw error
        }
        // getUser succeeds so the claims in the JWT can be trusted
        return {
          data: {
            claims: payload,
            header,
            signature
          },
          error: null
        }
      }

      const algorithm = getAlgorithm(header.alg)

      // Convert JWK to CryptoKey
      const publicKey = await crypto.subtle.importKey('jwk', signingKey, algorithm, true, [
        'verify'
      ])

      // Verify the signature
      const isValid = await crypto.subtle.verify(
        algorithm,
        publicKey,
        signature,
        stringToUint8Array(`${rawHeader}.${rawPayload}`)
      )

      if (!isValid) {
        throw new AuthInvalidJwtError('Invalid JWT signature')
      }

      // If verification succeeds, decode and return claims
      return {
        data: {
          claims: payload,
          header,
          signature
        },
        error: null
      }
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: null, error })
      }
      throw error
    }
  }

  private async _exchangeCodeForSession(authCode: string): Promise<
    | {
        data: { session: AccessTokenResponse; user: PublicUser; redirectType: string | null }
        error: null
      }
    | { data: { session: null; user: null; redirectType: null }; error: AuthError }
  > {
    const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`)
    const [codeVerifier, redirectType] = ((storageItem ?? '') as string).split('/')

    try {
      if (!codeVerifier && this.flowType === 'pkce') {
        throw new AuthPKCECodeVerifierMissingError()
      }

      const { data, error } = await _request(
        this.fetch,
        'POST',
        `${this.url}/token?grant_type=pkce`,
        {
          headers: this.headers,
          body: {
            auth_code: authCode,
            code_verifier: codeVerifier
          },
          xform: _sessionResponse
        }
      )
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (error) {
        throw error
      }
      if (!data || !data.session || !data.user) {
        const invalidTokenError = new AuthInvalidTokenResponseError()
        return this._returnResult({
          data: { user: null, session: null, redirectType: null },
          error: invalidTokenError
        })
      }
      if (data.session) {
        await this._saveSession(data.session)
        await this._notifyAllSubscribers(
          redirectType === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN',
          data.session
        )
      }
      return this._returnResult({ data: { ...data, redirectType: redirectType ?? null }, error })
    } catch (error) {
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
      if (isAuthError(error)) {
        return this._returnResult({
          data: { user: null, session: null, redirectType: null },
          error
        })
      }
      throw error
    }
  }

  private createUrl(
    path: string,
    query: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path.replace(/^\/+/, ''), `${this.baseUrl}/`)
    url.searchParams.set('project_id', this.projectId)

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }
}
