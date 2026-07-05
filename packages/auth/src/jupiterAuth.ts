import {
  HttpClient,
  JUPITER_PROJECT_ID_HEADER,
  createHeaders,
  type HeadersInitLike,
  type HttpClientOptions,
  type JsonObject,
  type RequestOptions
} from '@jupiter-cloud/core'
import type {
  AccessTokenResponse,
  AdminFactorUpdateOptions,
  AdminFactorUpdateRequest,
  AdminListUsersOptions,
  AdminListUsersResponse,
  AdminUserOptions,
  AdminUserRequest,
  AnonymousSignupRequest,
  AuthRequestOptions,
  AuthResult,
  AuthenticatedRequestOptions,
  AuthorizeUrlOptions,
  BearerTokenRequestOptions,
  ChallengeFactorRequest,
  ChallengeFactorResponse,
  EmptyObject,
  EnrollFactorOptions,
  EnrollFactorRequest,
  EnrollFactorResponse,
  FactorId,
  ForgotPasswordVerifyOptions,
  ForgotPasswordVerifyRequest,
  HealthCheckResponse,
  IdTokenSignInOptions,
  InviteRequest,
  JwksResponse,
  JupiterAuthOptions,
  LinkIdentityOptions,
  LogoutScope,
  MessageIdResponse,
  OAuthCallbackForm,
  PasswordSignInOptions,
  PkceExchangeOptions,
  ProjectId,
  PublicFactor,
  PublicUser,
  RecoverRequest,
  RedirectRequestOptions,
  ResendRequest,
  SignupConfirmationResponse,
  SignupOptions,
  SignupRequest,
  TokenGrantType,
  TokenOptions,
  TokenRequest,
  UnenrollFactorResponse,
  UrlResponse,
  UserId,
  UserUpdateOptions,
  UserUpdatePasswordOptions,
  UserUpdatePasswordRequest,
  UserUpdateRequest,
  VerificationMessageResponse,
  VerifyFactorOptions,
  VerifyFactorRequest,
  VerifyOptions,
  VerifyRequest,
  OtpOptions,
  OtpRequest
} from './types'

const defaultAuthenticatedRole = 'authenticated'
const defaultAdminRole = 'admin'
const jupiterClaimsHeader = 'X-Jupiter-Claims'
const jupiterRoleHeader = 'X-Jupiter-Role'
const redirectToHeader = 'redirect_to'

/**
 * Client for Jupiter Auth.
 *
 * This class exposes service-level methods directly. Users should call
 * `jupiter.auth.signUp(...)`, `jupiter.auth.signInWithPassword(...)`, and
 * similar methods from the aggregate Jupiter client.
 */
export class JupiterAuth {
  readonly http: HttpClient
  readonly projectId: string

  private readonly baseUrl: string
  private readonly claims: JsonObject | string | undefined

  constructor(url: string, options: JupiterAuthOptions) {
    this.baseUrl = url.replace(/\/+$/, '')
    this.projectId = options.projectId
    this.claims = options.claims

    const headers = createHeaders(options.headers, {
      Authorization: options.token ? `Bearer ${options.token}` : undefined,
      [JUPITER_PROJECT_ID_HEADER]: options.projectId
    })

    const httpOptions: HttpClientOptions = {
      fetch: options.fetch,
      headers,
      retry: {
        attempts: options.retryAttempts ?? 1
      },
      timeoutMs: options.timeoutMs
    }

    this.http = new HttpClient(this.baseUrl, httpOptions)
  }

  private request<TData>(path: string, options: RequestOptions = {}): AuthResult<TData> {
    return this.http.request<TData>(path, options)
  }

  /** Check whether the Auth service is reachable. */
  healthCheck(signal?: AbortSignal): AuthResult<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health', withSignal({}, signal))
  }

  /** Get the JSON Web Key Set for a project. */
  getJwks(projectId: ProjectId = this.projectId, signal?: AbortSignal): AuthResult<JwksResponse> {
    return this.request<JwksResponse>(
      `/${encodePathSegment(projectId)}/.well-known/jwks.json`,
      withSignal({}, signal)
    )
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

  /** Handle an OAuth provider GET callback. */
  externalProviderCallbackGet(
    options: Omit<OAuthCallbackForm, 'user'>,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<Blob> {
    return this.request<Blob>(
      '/callback',
      withSignal(
        {
          query: {
            code: options.code,
            error: options.error,
            error_description: options.error_description,
            oauth_token: options.oauth_token,
            oauth_verifier: options.oauth_verifier,
            state: options.state
          }
        },
        requestOptions.signal
      )
    )
  }

  /** Sign up with email, phone, or anonymous credentials. */
  signUp(
    options: SignupOptions,
    requestOptions: RedirectRequestOptions = {}
  ): AuthResult<AccessTokenResponse | PublicUser | SignupConfirmationResponse> {
    return this.request<AccessTokenResponse | PublicUser | SignupConfirmationResponse>(
      '/signup',
      withSignal(
        {
          body: toSignupRequest(options),
          headers: redirectHeaders(requestOptions),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Create an anonymous user and session. */
  signUpAnonymous(
    options: AnonymousSignupRequest = {},
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.request<AccessTokenResponse>(
      '/signup/anonymous',
      withSignal(
        {
          body: options,
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Send a password recovery email. */
  recover(
    options: RecoverRequest,
    requestOptions: RedirectRequestOptions = {}
  ): AuthResult<EmptyObject> {
    return this.request<EmptyObject>(
      '/forgot-password',
      withSignal(
        {
          body: options,
          headers: redirectHeaders(requestOptions),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Verify a password recovery token. */
  verifyForgotPassword(
    options: ForgotPasswordVerifyOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.request<AccessTokenResponse>(
      '/forgot-password/verify',
      withSignal(
        {
          body: toForgotPasswordVerifyRequest(options),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Resend a confirmation, email-change, SMS, or phone-change token. */
  resend(
    options: ResendRequest,
    requestOptions: RedirectRequestOptions = {}
  ): AuthResult<MessageIdResponse> {
    return this.request<MessageIdResponse>(
      '/resend',
      withSignal(
        {
          body: options,
          headers: redirectHeaders(requestOptions),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Send an email magic link or phone OTP. */
  sendOtp(
    options: OtpOptions,
    requestOptions: RedirectRequestOptions = {}
  ): AuthResult<MessageIdResponse> {
    return this.request<MessageIdResponse>(
      '/otp',
      withSignal(
        {
          body: toOtpRequest(options),
          headers: redirectHeaders(requestOptions),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Issue access and refresh tokens for a grant type. */
  token(
    grantType: TokenGrantType,
    options: TokenOptions,
    requestOptions: BearerTokenRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.request<AccessTokenResponse>(
      '/token',
      withSignal(
        {
          body: toTokenRequest(options),
          headers: bearerHeaders(requestOptions),
          method: 'POST',
          query: {
            grant_type: grantType
          }
        },
        requestOptions.signal
      )
    )
  }

  /** Sign in with email or phone and password. */
  signInWithPassword(
    options: PasswordSignInOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.token('password', options, requestOptions)
  }

  /** Refresh a session with a refresh token. */
  refreshToken(
    refreshToken: string,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.token(
      'refresh_token',
      {
        refreshToken
      },
      requestOptions
    )
  }

  /** Sign in with an external ID token. */
  signInWithIdToken(
    options: IdTokenSignInOptions,
    requestOptions: BearerTokenRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.token('id_token', options, requestOptions)
  }

  /** Exchange a PKCE auth code for a session. */
  exchangeCodeForSession(
    options: PkceExchangeOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.token('pkce', options, requestOptions)
  }

  /** Verify an OTP or token hash. */
  verify(
    options: VerifyOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<AccessTokenResponse | VerificationMessageResponse> {
    return this.request<AccessTokenResponse | VerificationMessageResponse>(
      '/verify',
      withSignal(
        {
          body: toVerifyRequest(options),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Build an email-link verification URL for browser navigation. */
  getVerifyUrl(options: {
    type: Extract<
      VerifyOptions['type'],
      'signup' | 'invite' | 'recovery' | 'magiclink' | 'email_change'
    >
    token: string
    redirectTo?: string
    projectId?: ProjectId
  }): string {
    return this.createUrl('/verify', {
      project_id: options.projectId,
      redirect_to: options.redirectTo,
      token: options.token,
      type: options.type
    })
  }

  /** Log out the current user. */
  logout(
    scope?: LogoutScope,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<EmptyObject> {
    return this.request<EmptyObject>(
      '/logout',
      withSignal(
        {
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'POST',
          query: {
            scope
          }
        },
        requestOptions.signal
      )
    )
  }

  /** Send a reauthentication OTP to the current user. */
  reauthenticate(requestOptions: AuthenticatedRequestOptions = {}): AuthResult<MessageIdResponse> {
    return this.request<MessageIdResponse>(
      '/reauthenticate',
      withSignal(
        {
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Get the current user. */
  getUser(requestOptions: AuthenticatedRequestOptions = {}): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      '/user',
      withSignal(
        {
          headers: authenticatedHeaders(requestOptions, this.claims)
        },
        requestOptions.signal
      )
    )
  }

  /** Update the current user. */
  updateUser(
    options: UserUpdateOptions,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      '/user',
      withSignal(
        {
          body: toUserUpdateRequest(options),
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'PUT'
        },
        requestOptions.signal
      )
    )
  }

  /** Update the current user's password. */
  updateUserPassword(
    options: UserUpdatePasswordOptions,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      '/user/password',
      withSignal(
        {
          body: toUserUpdatePasswordRequest(options),
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'PUT'
        },
        requestOptions.signal
      )
    )
  }

  /**
   * Build the URL for linking an external identity.
   *
   * Use this for browser navigation when `skipHttpRedirect` is not set.
   */
  getLinkIdentityUrl(options: LinkIdentityOptions): string {
    return this.createUrl('/user/identities/authorize', linkIdentityQuery(options))
  }

  /** Start linking an external identity to the current user. */
  linkIdentity(options: LinkIdentityOptions): AuthResult<UrlResponse> {
    return this.request<UrlResponse>(
      '/user/identities/authorize',
      withSignal(
        {
          headers: authenticatedHeaders(options, this.claims),
          query: linkIdentityQuery(options)
        },
        options.signal
      )
    )
  }

  /** Unlink an identity from the current user. */
  deleteIdentity(
    identityId: string,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<EmptyObject> {
    return this.request<EmptyObject>(
      `/user/identities/${encodePathSegment(identityId)}`,
      withSignal(
        {
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'DELETE'
        },
        requestOptions.signal
      )
    )
  }

  /** Enroll a TOTP, phone, or WebAuthn MFA factor. */
  enrollFactor(
    options: EnrollFactorOptions,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<EnrollFactorResponse> {
    return this.request<EnrollFactorResponse>(
      '/factors',
      withSignal(
        {
          body: toEnrollFactorRequest(options),
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Create a challenge for an MFA factor. */
  challengeFactor(
    factorId: FactorId,
    options: ChallengeFactorRequest = {},
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<ChallengeFactorResponse> {
    return this.request<ChallengeFactorResponse>(
      `/factors/${encodePathSegment(factorId)}/challenge`,
      withSignal(
        {
          body: options,
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Verify an MFA factor challenge. */
  verifyFactor(
    factorId: FactorId,
    options: VerifyFactorOptions,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<AccessTokenResponse> {
    return this.request<AccessTokenResponse>(
      `/factors/${encodePathSegment(factorId)}/verify`,
      withSignal(
        {
          body: toVerifyFactorRequest(options),
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Unenroll an MFA factor. */
  unenrollFactor(
    factorId: FactorId,
    requestOptions: AuthenticatedRequestOptions = {}
  ): AuthResult<UnenrollFactorResponse> {
    return this.request<UnenrollFactorResponse>(
      `/factors/${encodePathSegment(factorId)}`,
      withSignal(
        {
          headers: authenticatedHeaders(requestOptions, this.claims),
          method: 'DELETE'
        },
        requestOptions.signal
      )
    )
  }

  /** Invite a user by email. */
  adminInvite(
    options: InviteRequest,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      '/admin/invite',
      withSignal(
        {
          body: options,
          headers: adminHeaders(),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** List users as an admin. */
  adminListUsers(options: AdminListUsersOptions = {}): AuthResult<AdminListUsersResponse> {
    return this.request<AdminListUsersResponse>(
      '/admin/users',
      withSignal(
        {
          headers: adminHeaders(),
          query: {
            filter: options.filter,
            page: options.page,
            per_page: options.perPage,
            sort: options.sort
          }
        },
        options.signal
      )
    )
  }

  /** Create a user as an admin. */
  adminCreateUser(
    options: AdminUserOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      '/admin/users',
      withSignal(
        {
          body: toAdminUserRequest(options),
          headers: adminHeaders(),
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Get a user by ID as an admin. */
  adminGetUser(userId: UserId, requestOptions: AuthRequestOptions = {}): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      `/admin/users/${encodePathSegment(userId)}`,
      withSignal(
        {
          headers: adminHeaders()
        },
        requestOptions.signal
      )
    )
  }

  /** Update a user by ID as an admin. */
  adminUpdateUser(
    userId: UserId,
    options: AdminUserOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<PublicUser> {
    return this.request<PublicUser>(
      `/admin/users/${encodePathSegment(userId)}`,
      withSignal(
        {
          body: toAdminUserRequest(options),
          headers: adminHeaders(),
          method: 'PUT'
        },
        requestOptions.signal
      )
    )
  }

  /** Delete a user by ID as an admin. */
  adminDeleteUser(
    userId: UserId,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<EmptyObject> {
    return this.request<EmptyObject>(
      `/admin/users/${encodePathSegment(userId)}`,
      withSignal(
        {
          headers: adminHeaders(),
          method: 'DELETE'
        },
        requestOptions.signal
      )
    )
  }

  /** List a user's MFA factors as an admin. */
  adminListUserFactors(
    userId: UserId,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<PublicFactor[] | null> {
    return this.request<PublicFactor[] | null>(
      `/admin/users/${encodePathSegment(userId)}/factors`,
      withSignal(
        {
          headers: adminHeaders()
        },
        requestOptions.signal
      )
    )
  }

  /** Update a user's MFA factor as an admin. */
  adminUpdateUserFactor(
    userId: UserId,
    factorId: FactorId,
    options: AdminFactorUpdateOptions,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<PublicFactor[]> {
    return this.request<PublicFactor[]>(
      `/admin/users/${encodePathSegment(userId)}/factors/${encodePathSegment(factorId)}`,
      withSignal(
        {
          body: toAdminFactorUpdateRequest(options),
          headers: adminHeaders(),
          method: 'PUT'
        },
        requestOptions.signal
      )
    )
  }

  /** Delete a user's MFA factor as an admin. */
  adminDeleteUserFactor(
    userId: UserId,
    factorId: FactorId,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<PublicFactor[]> {
    return this.request<PublicFactor[]>(
      `/admin/users/${encodePathSegment(userId)}/factors/${encodePathSegment(factorId)}`,
      withSignal(
        {
          headers: adminHeaders(),
          method: 'DELETE'
        },
        requestOptions.signal
      )
    )
  }

  /** Post an OAuth form callback. Mostly useful for server-side callback handlers. */
  externalProviderCallbackPost(
    options: OAuthCallbackForm,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<Blob> {
    return this.request<Blob>(
      '/callback',
      withSignal(
        {
          body: toFormBody(options),
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          method: 'POST'
        },
        requestOptions.signal
      )
    )
  }

  /** Alias for `externalProviderCallbackPost`. */
  externalProviderCallback(
    options: OAuthCallbackForm,
    requestOptions: AuthRequestOptions = {}
  ): AuthResult<Blob> {
    return this.externalProviderCallbackPost(options, requestOptions)
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

function toSignupRequest(options: SignupOptions): SignupRequest {
  return clean({
    attributes: options.attributes,
    channel: options.channel,
    code_challenge: options.codeChallenge,
    code_challenge_method: options.codeChallengeMethod,
    email: options.email,
    password: options.password,
    phone: options.phone
  })
}

function toForgotPasswordVerifyRequest(
  options: ForgotPasswordVerifyOptions
): ForgotPasswordVerifyRequest {
  return clean({
    email: options.email,
    new_password: options.newPassword,
    redirect_to: options.redirectTo,
    token: options.token,
    token_hash: options.tokenHash
  })
}

function toOtpRequest(options: OtpOptions): OtpRequest {
  return clean({
    attributes: options.attributes,
    channel: options.channel,
    code_challenge: options.codeChallenge,
    code_challenge_method: options.codeChallengeMethod,
    create_user: options.createUser,
    email: options.email,
    phone: options.phone
  })
}

function toTokenRequest(options: TokenOptions): TokenRequest {
  return clean({
    access_token: options.accessToken,
    auth_code: options.authCode,
    client_id: options.clientId,
    code_verifier: options.codeVerifier,
    email: options.email,
    id_token: options.idToken,
    issuer: options.issuer,
    link_identity: options.linkIdentity,
    nonce: options.nonce,
    password: options.password,
    phone: options.phone,
    provider: options.provider,
    refresh_token: options.refreshToken
  })
}

function toVerifyRequest(options: VerifyOptions): VerifyRequest {
  return clean({
    email: options.email,
    new_password: options.newPassword,
    phone: options.phone,
    redirect_to: options.redirectTo,
    token: options.token,
    token_hash: options.tokenHash,
    type: options.type
  })
}

function toUserUpdateRequest(options: UserUpdateOptions): UserUpdateRequest {
  return clean({
    app_metadata: options.appMetadata,
    attributes: options.attributes,
    channel: options.channel,
    code_challenge: options.codeChallenge,
    code_challenge_method: options.codeChallengeMethod,
    email: options.email,
    nonce: options.nonce,
    phone: options.phone
  })
}

function toUserUpdatePasswordRequest(
  options: UserUpdatePasswordOptions
): UserUpdatePasswordRequest {
  const request: UserUpdatePasswordRequest = {
    new_password: options.newPassword
  }

  if (options.currentPassword !== undefined) {
    request.current_password = options.currentPassword
  }

  return request
}

function toEnrollFactorRequest(options: EnrollFactorOptions): EnrollFactorRequest {
  return clean({
    display_name: options.displayName,
    factor_type: options.factorType,
    issuer: options.issuer,
    phone: options.phone
  })
}

function toVerifyFactorRequest(options: VerifyFactorOptions): VerifyFactorRequest {
  return clean({
    challenge_id: options.challengeId,
    code: options.code,
    webauthn: options.webauthn
  })
}

function toAdminUserRequest(options: AdminUserOptions): AdminUserRequest {
  return clean({
    attributes: options.attributes,
    email: options.email,
    email_confirm: options.emailConfirm,
    id: options.id,
    password: options.password,
    password_hash: options.passwordHash,
    phone: options.phone,
    phone_confirm: options.phoneConfirm,
    role: options.role,
    system_attributes: options.systemAttributes
  })
}

function toAdminFactorUpdateRequest(options: AdminFactorUpdateOptions): AdminFactorUpdateRequest {
  return clean({
    display_name: options.displayName,
    phone: options.phone
  })
}

function linkIdentityQuery(
  options: LinkIdentityOptions
): Record<string, string | number | boolean | undefined> {
  return {
    code_challenge: options.codeChallenge,
    code_challenge_method: options.codeChallengeMethod,
    provider: options.provider,
    scopes: options.scopes,
    skip_http_redirect: options.skipHttpRedirect
  }
}

function authenticatedHeaders(
  requestOptions: AuthenticatedRequestOptions,
  defaultClaims: JsonObject | string | undefined
): HeadersInitLike {
  return {
    [jupiterClaimsHeader]: encodeClaims(requestOptions.claims ?? defaultClaims),
    [jupiterRoleHeader]: defaultAuthenticatedRole
  }
}

function adminHeaders(): HeadersInitLike {
  return {
    [jupiterRoleHeader]: defaultAdminRole
  }
}

function redirectHeaders(options: RedirectRequestOptions): HeadersInitLike {
  return {
    [redirectToHeader]: options.redirectTo
  }
}

function bearerHeaders(options: BearerTokenRequestOptions): HeadersInitLike {
  return {
    Authorization: options.token ? `Bearer ${options.token}` : undefined
  }
}

function toFormBody(values: Record<string, string | undefined>): URLSearchParams {
  const body = new URLSearchParams()

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      body.set(key, value)
    }
  }

  return body
}

function encodeClaims(claims: JsonObject | string | undefined): string | undefined {
  if (claims === undefined) {
    return undefined
  }

  return typeof claims === 'string' ? claims : JSON.stringify(claims)
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

function clean<TObject extends Record<string, unknown>>(object: TObject): TObject {
  for (const key of Object.keys(object) as (keyof TObject)[]) {
    if (object[key] === undefined) {
      delete object[key]
    }
  }

  return object
}

function withSignal<TOptions extends RequestOptions>(
  options: TOptions,
  signal: AbortSignal | undefined
): TOptions {
  if (signal !== undefined) {
    options.signal = signal
  }

  return options
}
