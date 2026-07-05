import type { Fetch, JsonObject, JupiterErrorPayload, JupiterResult } from '@jupiter-cloud/core'

/**
 * ISO-8601 timestamp string returned by the Auth API.
 *
 * Example: `2026-07-05T12:34:56.000Z`.
 */
export type IsoTimestamp = string

/** Project identifier used to scope Auth operations. */
export type ProjectId = string

/** Jupiter Auth user identifier. */
export type UserId = string

/** External identity identifier. */
export type IdentityId = string

/** Multi-factor authentication factor identifier. */
export type FactorId = string

/** Multi-factor authentication challenge identifier. */
export type ChallengeId = string

/** Provider-specific OAuth scopes encoded as the provider expects. */
export type OAuthScopes = string

/** Empty JSON object response. */
export type EmptyObject = Record<string, never>

/** JSON Web Key Set response for a project. */
export type JwksResponse = {
  /** JSON Web Keys used to verify tokens issued for the project. */
  keys: JsonObject[]
}

/** Health check response. */
export type HealthCheckResponse = {
  /** Service name. */
  name: string
}

/** OAuth providers accepted by Jupiter Auth. */
export const OAUTH_PROVIDERS = [
  'apple',
  'azure',
  'bitbucket',
  'discord',
  'facebook',
  'figma',
  'fly',
  'github',
  'gitlab',
  'google',
  'kakao',
  'keycloak',
  'linkedin',
  'linkedin_oidc',
  'notion',
  'snapchat',
  'spotify',
  'slack',
  'slack_oidc',
  'twitch',
  'twitter',
  'x',
  'vercel_marketplace',
  'workos',
  'zoom'
] as const

/** OAuth provider identifier accepted by Jupiter Auth. */
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

/** PKCE code challenge transform. */
export type CodeChallengeMethod = 's256' | 'plain'

/** Phone OTP delivery channel. */
export type Channel = 'sms' | 'whatsapp'

/** Email link verification flow type. */
export type EmailVerificationType = 'signup' | 'invite' | 'recovery' | 'magiclink' | 'email_change'

/** OTP or token verification flow type. */
export type VerificationType = EmailVerificationType | 'sms' | 'phone_change'

/** Resendable confirmation flow type. */
export type ResendType = 'signup' | 'email_change' | 'sms' | 'phone_change'

/** Token grant type supported by `/token`. */
export type TokenGrantType = 'password' | 'refresh_token' | 'id_token' | 'pkce'

/** Gateway role header value for protected Auth endpoints. */
export type JupiterAuthRole = 'anonymous' | 'authenticated' | 'admin'

/** MFA factor type. */
export type FactorType = 'totp' | 'phone' | 'webauthn'

/** MFA factor verification status. */
export type FactorStatus = 'verified' | 'unverified'

/** Password policy feedback returned by Auth. */
export type WeakPassword = {
  /** Human-readable password policy message. */
  message?: string

  /** Machine-readable password weakness reasons. */
  reasons?: ('length' | 'characters' | 'pwned')[]
}

/** Error payload returned by Auth API failures. */
export type AuthApiError = JupiterErrorPayload & {
  /** Auth API error code. */
  code: string

  /** OAuth error code when the endpoint returns an OAuth-style error body. */
  error?: string

  /** OAuth error description when present. */
  error_description?: string

  /** Password policy details returned by signup or password endpoints. */
  weak_password?: WeakPassword
}

/** Error payload returned in failed `AuthResult` values. */
export type AuthError = AuthApiError

/** Result returned by Jupiter Auth methods. */
export type AuthResult<TData> = Promise<JupiterResult<TData, AuthError>>

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

/** User identity returned by Auth. */
export type PublicIdentity = {
  /** Identity UUID. */
  id?: IdentityId

  /** Provider-specific user identifier. */
  provider_id?: string

  /** Jupiter user UUID that owns the identity. */
  user_id?: UserId

  /** Provider that issued the identity. */
  provider?: string

  /** Email address reported by the provider. */
  email?: string

  /** Last provider sign-in timestamp, or null if never used. */
  last_sign_in_at?: IsoTimestamp | null

  /** Identity creation timestamp. */
  created_at?: IsoTimestamp

  /** Identity update timestamp. */
  updated_at?: IsoTimestamp

  /** Provider identity payload. */
  identity_data?: JsonObject
}

/** MFA factor returned by Auth. */
export type PublicFactor = {
  /** Factor UUID. */
  id?: FactorId

  /** Kind of MFA factor. */
  factor_type?: FactorType

  /** Factor verification status. */
  status?: FactorStatus

  /** User-facing factor label. */
  display_name?: string

  /** Phone number for phone factors. */
  phone?: string

  /** Factor creation timestamp. */
  created_at?: IsoTimestamp

  /** Factor update timestamp. */
  updated_at?: IsoTimestamp

  /** Last challenge timestamp, or null if never challenged. */
  last_challenged_at?: IsoTimestamp | null
}

/** Public user record returned by Auth. */
export type PublicUser = {
  /** User UUID. */
  id: UserId

  /** Project that owns the user. */
  project_id: ProjectId

  /** User email address. */
  email?: string

  /** User phone number. */
  phone?: string

  /** Whether the user's email is verified. */
  email_verified: boolean

  /** Whether the user's phone is verified. */
  phone_verified: boolean

  /** Whether the user was created as an anonymous user. */
  is_anonymous: boolean

  /** User creation timestamp. */
  created_at: IsoTimestamp

  /** User update timestamp. */
  updated_at: IsoTimestamp

  /** Last sign-in timestamp, or null if never signed in. */
  last_sign_in_at?: IsoTimestamp | null

  /** Identity providers linked to the user. */
  providers?: string[]

  /** External identities linked to the user. */
  identities?: PublicIdentity[]

  /** MFA factors enrolled by the user. */
  factors?: PublicFactor[]

  /** User-controlled metadata. */
  user_metadata?: JsonObject

  /** System-controlled metadata. */
  system_attributes?: JsonObject
}

/** Access and refresh token response. */
export type AccessTokenResponse = {
  /** Access token used to authorize Auth-protected requests. */
  access_token: string

  /** Token type, usually `bearer`. */
  token_type: string

  /** Access token lifetime in seconds. */
  expires_in: number

  /** Unix timestamp when the access token expires. */
  expires_at: number

  /** Refresh token used to mint a new access token. */
  refresh_token: string

  /** User record associated with the session. */
  user?: PublicUser

  /** Provider access token returned by external OAuth flows. */
  provider_token?: string

  /** Provider refresh token returned by external OAuth flows. */
  provider_refresh_token?: string

  /** Password policy details when a password is accepted but weak. */
  weak_password?: WeakPassword

  /** ID token returned by identity provider flows. */
  id_token?: string
}

/** Signup response when confirmation is still required. */
export type SignupConfirmationResponse = {
  /** Created user UUID. */
  user_id?: UserId

  /** Delivery mechanism used for the confirmation token. */
  delivery_method?: string

  /** Whether confirmation is required before sign-in. */
  confirmation_required?: boolean
}

/** Response returned by email or phone sends. */
export type MessageIdResponse = {
  /** Provider message identifier for phone sends. */
  message_id?: string
}

/** Response returned by two-step verification acknowledgements. */
export type VerificationMessageResponse = {
  /** Human-readable message. */
  msg?: string

  /** Machine-readable acknowledgement code. */
  code?: string
}

/** URL response returned by redirect endpoints when HTTP redirect is skipped. */
export type UrlResponse = {
  /** URL the caller should navigate to. */
  url: string
}

/** Raw signup request body accepted by the Auth API. */
export type SignupRequest = {
  email?: string | undefined
  phone?: string | undefined
  password?: string | undefined
  attributes?: JsonObject | undefined
  channel?: Channel | undefined
  code_challenge_method?: CodeChallengeMethod | undefined
  code_challenge?: string | undefined
}

/** Ergonomic signup options. */
export type SignupOptions = {
  email?: string
  phone?: string
  password?: string
  attributes?: JsonObject
  channel?: Channel
  codeChallengeMethod?: CodeChallengeMethod
  codeChallenge?: string
}

/** Anonymous signup request body accepted by the Auth API. */
export type AnonymousSignupRequest = {
  attributes?: JsonObject | undefined
}

/** Password recovery request body. */
export type RecoverRequest = {
  email: string
}

/** Verify forgot-password request body. */
export type ForgotPasswordVerifyRequest = {
  token?: string | undefined
  token_hash?: string | undefined
  email?: string | undefined
  redirect_to?: string | undefined
  new_password?: string | undefined
}

/** Ergonomic forgot-password verification options. */
export type ForgotPasswordVerifyOptions = {
  token?: string
  tokenHash?: string
  email?: string
  redirectTo?: string
  newPassword?: string
}

/** Resend request body. */
export type ResendRequest = {
  type: ResendType
  email?: string | undefined
  phone?: string | undefined
}

/** OTP request body. */
export type OtpRequest = {
  email?: string | undefined
  phone?: string | undefined
  create_user?: boolean | undefined
  attributes?: JsonObject | undefined
  channel?: Channel | undefined
  code_challenge_method?: CodeChallengeMethod | undefined
  code_challenge?: string | undefined
}

/** Ergonomic OTP options. */
export type OtpOptions = {
  email?: string
  phone?: string
  createUser?: boolean
  attributes?: JsonObject
  channel?: Channel
  codeChallengeMethod?: CodeChallengeMethod
  codeChallenge?: string
}

/** Token request body accepted by the Auth API. */
export type TokenRequest = {
  email?: string | undefined
  phone?: string | undefined
  password?: string | undefined
  refresh_token?: string | undefined
  id_token?: string | undefined
  access_token?: string | undefined
  nonce?: string | undefined
  provider?: string | undefined
  client_id?: string | undefined
  issuer?: string | undefined
  link_identity?: boolean | undefined
  auth_code?: string | undefined
  code_verifier?: string | undefined
}

/** Ergonomic token options. */
export type TokenOptions = {
  email?: string
  phone?: string
  password?: string
  refreshToken?: string
  idToken?: string
  accessToken?: string
  nonce?: string
  provider?: OAuthProvider | (string & {})
  clientId?: string
  issuer?: string
  linkIdentity?: boolean
  authCode?: string
  codeVerifier?: string
}

/** Password sign-in options. */
export type PasswordSignInOptions = {
  email?: string
  phone?: string
  password: string
}

/** ID token sign-in options. */
export type IdTokenSignInOptions = {
  idToken: string
  provider?: OAuthProvider | (string & {})
  accessToken?: string
  nonce?: string
  clientId?: string
  issuer?: string
  linkIdentity?: boolean
}

/** PKCE code exchange options. */
export type PkceExchangeOptions = {
  authCode: string
  codeVerifier: string
}

/** Verify request body accepted by the Auth API. */
export type VerifyRequest = {
  type: VerificationType
  token?: string | undefined
  token_hash?: string | undefined
  email?: string | undefined
  phone?: string | undefined
  redirect_to?: string | undefined
  new_password?: string | undefined
}

/** Ergonomic verification options. */
export type VerifyOptions = {
  type: VerificationType
  token?: string
  tokenHash?: string
  email?: string
  phone?: string
  redirectTo?: string
  newPassword?: string
}

/** User update request body. */
export type UserUpdateRequest = {
  email?: string | undefined
  phone?: string | undefined
  nonce?: string | undefined
  attributes?: JsonObject | undefined
  app_metadata?: JsonObject | undefined
  channel?: Channel | undefined
  code_challenge_method?: CodeChallengeMethod | undefined
  code_challenge?: string | undefined
}

/** Ergonomic current-user update options. */
export type UserUpdateOptions = {
  email?: string
  phone?: string
  nonce?: string
  attributes?: JsonObject
  appMetadata?: JsonObject
  channel?: Channel
  codeChallengeMethod?: CodeChallengeMethod
  codeChallenge?: string
}

/** Current-user password update request body. */
export type UserUpdatePasswordRequest = {
  new_password: string
  current_password?: string | null
}

/** Ergonomic current-user password update options. */
export type UserUpdatePasswordOptions = {
  newPassword: string
  currentPassword?: string | null
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

/** Logout scope. */
export type LogoutScope = 'global' | 'local' | 'others'

/** TOTP factor details returned during enrollment. */
export type TotpObject = {
  /** SVG QR code. */
  qr_code?: string

  /** Shared TOTP secret. */
  secret?: string

  /** OTP auth URI. */
  uri?: string
}

/** MFA factor enrollment request body. */
export type EnrollFactorRequest = {
  display_name?: string | undefined
  factor_type: FactorType
  issuer?: string | undefined
  phone?: string | undefined
}

/** Ergonomic MFA factor enrollment options. */
export type EnrollFactorOptions = {
  displayName?: string
  factorType: FactorType
  issuer?: string
  phone?: string
}

/** MFA enrollment response. */
export type EnrollFactorResponse = {
  id?: FactorId
  type?: FactorType
  display_name?: string
  totp?: TotpObject
  phone?: string
}

/** WebAuthn request or response payload. */
export type WebAuthnParams = {
  rpId?: string | undefined
  rpOrigins?: string[] | undefined
  type?: 'create' | 'request' | undefined
  credential_response?: JsonObject | undefined
}

/** MFA factor challenge request body. */
export type ChallengeFactorRequest = {
  channel?: Channel | undefined
  webauthn?: WebAuthnParams | undefined
}

/** WebAuthn challenge details returned by Auth. */
export type WebAuthnChallengeData = {
  type?: 'create' | 'request'
  credential_options?: JsonObject
}

/** MFA factor challenge response. */
export type ChallengeFactorResponse = {
  id?: ChallengeId
  type?: FactorType
  expires_at?: number
  webauthn?: WebAuthnChallengeData
}

/** MFA factor verification request body. */
export type VerifyFactorRequest = {
  challenge_id: ChallengeId
  code?: string | undefined
  webauthn?: WebAuthnParams | undefined
}

/** Ergonomic MFA factor verification options. */
export type VerifyFactorOptions = {
  challengeId: ChallengeId
  code?: string
  webauthn?: WebAuthnParams
}

/** MFA factor unenrollment response. */
export type UnenrollFactorResponse = {
  id: FactorId
}

/** Admin invite request body. */
export type InviteRequest = {
  email: string
  attributes?: JsonObject | undefined
}

/** Admin user create/update request body. */
export type AdminUserRequest = {
  id?: UserId | undefined
  role?: string | undefined
  email?: string | undefined
  phone?: string | undefined
  password?: string | null | undefined
  password_hash?: string | undefined
  email_confirm?: boolean | undefined
  phone_confirm?: boolean | undefined
  attributes?: JsonObject | undefined
  system_attributes?: JsonObject | undefined
}

/** Ergonomic admin user create/update options. */
export type AdminUserOptions = {
  id?: UserId
  role?: string
  email?: string
  phone?: string
  password?: string | null
  passwordHash?: string
  emailConfirm?: boolean
  phoneConfirm?: boolean
  attributes?: JsonObject
  systemAttributes?: JsonObject
}

/** Admin user list response. */
export type AdminListUsersResponse = {
  users: PublicUser[]
}

/** Admin list users query options. */
export type AdminListUsersOptions = AuthRequestOptions & {
  page?: number
  perPage?: number
  sort?: 'created_at asc' | 'created_at desc'
  filter?: string
}

/** Admin MFA factor update request body. */
export type AdminFactorUpdateRequest = {
  display_name?: string | undefined
  phone?: string | undefined
}

/** Ergonomic admin MFA factor update options. */
export type AdminFactorUpdateOptions = {
  displayName?: string
  phone?: string
}

/** OAuth callback form body. */
export type OAuthCallbackForm = {
  state: string
  code?: string | undefined
  error?: string | undefined
  error_description?: string | undefined
  oauth_token?: string | undefined
  oauth_verifier?: string | undefined
  user?: string | undefined
}
