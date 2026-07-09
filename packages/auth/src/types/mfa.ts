import type { AuthError } from '../internal/errors'
import type {
  ServerCredentialCreationOptions,
  ServerCredentialRequestOptions,
  ServerCredentialResponse,
  WebAuthnApi
} from '../internal/webauthn'
import type {
  AuthenticationCredential,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsFuture,
  PublicKeyCredentialRequestOptionsFuture,
  RegistrationCredential,
  RegistrationResponseJSON
} from '../internal/webauthn.dom'
import type { WebAuthnError } from '../internal/webauthn.errors'
import type { PublicFactor } from './models'
import type { Fetch } from '@jupiter-cloud/core'
import type { AuthMFAVerifyResponse } from './outputs'
import type { AuthChangeEvent } from './authEvents'

export type Provider =
  | 'apple'
  | 'azure'
  | 'bitbucket'
  | 'discord'
  | 'facebook'
  | 'figma'
  | 'github'
  | 'gitlab'
  | 'google'
  | 'kakao'
  | 'keycloak'
  | 'linkedin'
  | 'linkedin_oidc'
  | 'notion'
  | 'slack'
  | 'slack_oidc'
  | 'spotify'
  | 'twitch'
  | 'twitter'
  | 'x'
  | 'workos'
  | 'zoom'
  | 'fly'
  | `custom:${string}`

export type LockFunc = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>

export type GoTrueClientOptions = {
  url?: string

  headers?: { [key: string]: string }

  storageKey?: string

  detectSessionInUrl?: boolean | ((url: URL, params: { [parameter: string]: string }) => boolean)

  autoRefreshToken?: boolean

  persistSession?: boolean

  storage?: SupportedStorage

  userStorage?: SupportedStorage

  fetch?: Fetch

  flowType?: AuthFlowType

  debug?: boolean | ((message: string, ...args: any[]) => void)

  lock?: LockFunc

  hasCustomAuthorizationHeader?: boolean

  throwOnError?: boolean

  lockAcquireTimeout?: number

  skipAutoInitialize?: boolean

  experimental?: ExperimentalFeatureFlags
}

export type ExperimentalFeatureFlags = {
  passkey?: boolean
}

const WeakPasswordReasons = ['length', 'characters', 'pwned'] as const

export type WeakPasswordReasons = (typeof WeakPasswordReasons)[number]
export type WeakPassword = {
  reasons: WeakPasswordReasons[]
  message: string
}

export type Prettify<T> = T extends Function ? T : { [K in keyof T]: T[K] }

export type StrictOmit<T, K extends keyof T> = Omit<T, K>

export type RequestResult<T, ErrorType extends Error = AuthError> =
  | {
      data: T
      error: null
    }
  | {
      data: null
      error: Error extends AuthError ? AuthError : ErrorType
    }

export type RequestResultSafeDestructure<T> =
  | { data: T; error: null }
  | {
      data: T extends object ? { [K in keyof T]: null } : null
      error: AuthError
    }

export type AuthResponse = RequestResultSafeDestructure<{
  user: User | null
  session: Session | null
}>

export type AuthResponsePassword = RequestResultSafeDestructure<{
  user: User | null
  session: Session | null
  weak_password?: WeakPassword | null
}>

export type AuthOtpResponse = RequestResultSafeDestructure<{
  user: null
  session: null
  messageId?: string | null
}>

export type AuthTokenResponse = RequestResultSafeDestructure<{
  user: User
  session: Session
}>

export type AuthTokenResponsePassword = RequestResultSafeDestructure<{
  user: User
  session: Session
  weakPassword?: WeakPassword
}>

export type OAuthResponse =
  | {
      data: {
        provider: Provider
        url: string
      }
      error: null
    }
  | {
      data: {
        provider: Provider
        url: null
      }
      error: AuthError
    }

export type SSOResponse = RequestResult<{
  url: string
}>

export type UserResponse = RequestResultSafeDestructure<{
  user: User
}>

export interface Session {
  provider_token?: string | null

  provider_refresh_token?: string | null

  access_token: string

  refresh_token: string

  expires_in: number

  expires_at?: number
  token_type: 'bearer'

  user: User
}

const AMRMethods = [
  'password',
  'otp',
  'oauth',
  'totp',
  'mfa/totp',
  'mfa/phone',
  'mfa/webauthn',
  'anonymous',
  'sso/saml',
  'magiclink',
  'web3',
  'oauth_provider/authorization_code'
] as const

export type AMRMethod = (typeof AMRMethods)[number] | (string & {})

export interface AMREntry {
  method: AMRMethod

  timestamp: number
}

export interface UserIdentity {
  id: string
  user_id: string
  identity_data?: {
    [key: string]: any
  }
  identity_id: string
  provider: string
  created_at?: string
  last_sign_in_at?: string
  updated_at?: string
}

const FactorTypes = ['totp', 'phone', 'webauthn'] as const

export type FactorType = (typeof FactorTypes)[number]

const FactorVerificationStatuses = ['verified', 'unverified'] as const

type FactorVerificationStatus = (typeof FactorVerificationStatuses)[number]

export type Factor<
  Type extends FactorType = FactorType,
  Status extends FactorVerificationStatus = (typeof FactorVerificationStatuses)[number]
> = {
  id: string

  friendly_name?: string

  factor_type: Type

  status: Status

  created_at: string
  updated_at: string
  last_challenged_at?: string
}

export interface UserAppMetadata {
  provider?: string

  providers?: string[]
  [key: string]: any
}

export interface UserMetadata {
  [key: string]: any
}

export interface User {
  id: string
  app_metadata: UserAppMetadata
  user_metadata: UserMetadata
  aud: string
  confirmation_sent_at?: string
  recovery_sent_at?: string
  email_change_sent_at?: string
  new_email?: string
  new_phone?: string
  invited_at?: string
  action_link?: string
  email?: string
  phone?: string
  created_at: string
  confirmed_at?: string
  email_confirmed_at?: string
  phone_confirmed_at?: string
  last_sign_in_at?: string
  role?: string
  updated_at?: string
  identities?: UserIdentity[]
  is_anonymous?: boolean
  is_sso_user?: boolean
  factors?: (Factor<FactorType, 'verified'> | Factor<FactorType, 'unverified'>)[]
  deleted_at?: string
  banned_until?: string
}

export interface UserAttributes {
  current_password?: string

  email?: string

  phone?: string

  password?: string

  nonce?: string

  data?: object
}

export interface AdminUserAttributes extends Omit<UserAttributes, 'data'> {
  user_metadata?: object

  app_metadata?: object

  email_confirm?: boolean

  phone_confirm?: boolean

  ban_duration?: string | 'none'

  role?: string

  password_hash?: string

  id?: string
}

export interface Subscription {
  id: string | symbol

  callback: (event: AuthChangeEvent, session: Session | null) => void

  unsubscribe: () => void
}

export type SignInAnonymouslyCredentials = {
  options?: {
    data?: object

    captchaToken?: string
  }
}

export type SignUpWithPasswordCredentials = PasswordCredentialsBase & {
  options?: {
    emailRedirectTo?: string
    data?: object
    captchaToken?: string
    channel?: 'sms' | 'whatsapp'
  }
}

type PasswordCredentialsBase =
  { email: string; password: string } | { phone: string; password: string }

export type SignInWithPasswordCredentials = PasswordCredentialsBase & {
  options?: {
    captchaToken?: string
  }
}

export type SignInWithPasswordlessCredentials =
  | {
      email: string
      options?: {
        emailRedirectTo?: string

        shouldCreateUser?: boolean

        data?: object

        captchaToken?: string
      }
    }
  | {
      phone: string
      options?: {
        shouldCreateUser?: boolean

        data?: object

        captchaToken?: string

        channel?: 'sms' | 'whatsapp'
      }
    }

export type AuthFlowType = 'implicit' | 'pkce' | (string & {})
export type SignInWithOAuthCredentials = {
  provider: Provider
  options?: {
    redirectTo?: string

    scopes?: string

    queryParams?: { [key: string]: string }

    skipBrowserRedirect?: boolean
  }
}

export type SignInWithIdTokenCredentials = {
  provider: 'google' | 'apple' | 'azure' | 'facebook' | 'kakao' | `custom:${string}` | (string & {})

  token: string

  access_token?: string

  nonce?: string
  options?: {
    captchaToken?: string
  }
}

export type VerifyOtpParams = VerifyMobileOtpParams | VerifyEmailOtpParams | VerifyTokenHashParams
export interface VerifyMobileOtpParams {
  phone: string

  token: string

  type: MobileOtpType
  options?: {
    redirectTo?: string

    captchaToken?: string
  }
}
export interface VerifyEmailOtpParams {
  email: string

  token: string

  type: EmailOtpType
  options?: {
    redirectTo?: string

    captchaToken?: string
  }
}

export interface VerifyTokenHashParams {
  token_hash: string

  type: EmailOtpType
}

export type MobileOtpType = 'sms' | 'phone_change' | (string & {})
export type EmailOtpType =
  'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' | (string & {})

export type ResendParams =
  | {
      type: Extract<EmailOtpType, 'signup' | 'email_change'>
      email: string
      options?: {
        emailRedirectTo?: string

        captchaToken?: string
      }
    }
  | {
      type: Extract<MobileOtpType, 'sms' | 'phone_change'>
      phone: string
      options?: {
        captchaToken?: string
      }
    }

export type SignInWithSSO =
  | {
      providerId: string

      options?: {
        redirectTo?: string

        captchaToken?: string

        skipBrowserRedirect?: boolean
      }
    }
  | {
      domain: string

      options?: {
        redirectTo?: string

        captchaToken?: string

        skipBrowserRedirect?: boolean
      }
    }

export type GenerateSignupLinkParams = {
  type: 'signup'
  email: string
  password: string
  options?: Pick<GenerateLinkOptions, 'data' | 'redirectTo'>
}

export type GenerateInviteOrMagiclinkParams = {
  type: 'invite' | 'magiclink'

  email: string
  options?: Pick<GenerateLinkOptions, 'data' | 'redirectTo'>
}

export type GenerateRecoveryLinkParams = {
  type: 'recovery'

  email: string
  options?: Pick<GenerateLinkOptions, 'redirectTo'>
}

export type GenerateEmailChangeLinkParams = {
  type: 'email_change_current' | 'email_change_new'

  email: string

  newEmail: string
  options?: Pick<GenerateLinkOptions, 'redirectTo'>
}

export interface GenerateLinkOptions {
  data?: object

  redirectTo?: string
}

export type GenerateLinkParams =
  | GenerateSignupLinkParams
  | GenerateInviteOrMagiclinkParams
  | GenerateRecoveryLinkParams
  | GenerateEmailChangeLinkParams

export type GenerateLinkResponse = RequestResultSafeDestructure<{
  properties: GenerateLinkProperties
  user: User
}>

export type GenerateLinkProperties = {
  action_link: string

  email_otp: string

  hashed_token: string

  redirect_to: string

  verification_type: GenerateLinkType
}

export type GenerateLinkType =
  'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change_current' | 'email_change_new'

export type MFAEnrollParams = MFAEnrollTOTPParams | MFAEnrollPhoneParams | MFAEnrollWebauthnParams

export type MFAUnenrollParams = {
  factorId: string
}

type MFAVerifyParamsBase = {
  factorId: string

  challengeId: string
}

type MFAVerifyTOTPParamFields = {
  code: string
}

export type MFAVerifyTOTPParams = MFAVerifyParamsBase & MFAVerifyTOTPParamFields

type MFAVerifyPhoneParamFields = MFAVerifyTOTPParamFields

export type MFAVerifyPhoneParams = MFAVerifyParamsBase & MFAVerifyPhoneParamFields

type MFAVerifyWebauthnParamFieldsBase = {
  rpId: string

  rpOrigins?: string[]
}

type MFAVerifyWebauthnCredentialParamFields<T extends 'create' | 'request' = 'create' | 'request'> =
  {
    type: T

    credential_response: T extends 'create' ? RegistrationCredential : AuthenticationCredential
  }

export type MFAVerifyWebauthnParamFields<T extends 'create' | 'request' = 'create' | 'request'> = {
  webauthn: MFAVerifyWebauthnParamFieldsBase & MFAVerifyWebauthnCredentialParamFields<T>
}

export type MFAVerifyWebauthnParams<T extends 'create' | 'request' = 'create' | 'request'> =
  MFAVerifyParamsBase & MFAVerifyWebauthnParamFields<T>

export type MFAVerifyParams = MFAVerifyTOTPParams | MFAVerifyPhoneParams | MFAVerifyWebauthnParams

type MFAChallengeParamsBase = {
  factorId: string
}

const MFATOTPChannels = ['sms', 'whatsapp'] as const
export type MFATOTPChannel = (typeof MFATOTPChannels)[number]

export type MFAChallengeTOTPParams = MFAChallengeParamsBase

type MFAChallengePhoneParamFields<Channel extends MFATOTPChannel = MFATOTPChannel> = {
  channel: Channel
}

export type MFAChallengePhoneParams = MFAChallengeParamsBase & MFAChallengePhoneParamFields

type MFAChallengeWebauthnParamFields = {
  webauthn: {
    rpId: string

    rpOrigins?: string[]
  }
}

export type MFAChallengeWebauthnParams = MFAChallengeParamsBase & MFAChallengeWebauthnParamFields

export type MFAChallengeParams =
  MFAChallengeTOTPParams | MFAChallengePhoneParams | MFAChallengeWebauthnParams

type MFAChallengeAndVerifyParamsBase = Omit<MFAVerifyParamsBase, 'challengeId'>

type MFAChallengeAndVerifyTOTPParamFields = MFAVerifyTOTPParamFields

type MFAChallengeAndVerifyTOTPParams = MFAChallengeAndVerifyParamsBase &
  MFAChallengeAndVerifyTOTPParamFields

export type MFAChallengeAndVerifyParams = MFAChallengeAndVerifyTOTPParams

export type AuthMFAEnrollResponse =
  AuthMFAEnrollTOTPResponse | AuthMFAEnrollPhoneResponse | AuthMFAEnrollWebauthnResponse

export type AuthMFAUnenrollResponse = RequestResult<{
  id: string
}>

type AuthMFAChallengeResponseBase<T extends FactorType> = {
  id: string

  type: T

  expires_at: number
}

type AuthMFAChallengeTOTPResponseFields = {}

export type AuthMFAChallengeTOTPResponse = RequestResult<
  AuthMFAChallengeResponseBase<'totp'> & AuthMFAChallengeTOTPResponseFields
>

type AuthMFAChallengePhoneResponseFields = {}

export type AuthMFAChallengePhoneResponse = RequestResult<
  AuthMFAChallengeResponseBase<'phone'> & AuthMFAChallengePhoneResponseFields
>

type AuthMFAChallengeWebauthnResponseFields = {
  webauthn:
    | {
        type: 'create'
        credential_options: { publicKey: PublicKeyCredentialCreationOptionsFuture }
      }
    | {
        type: 'request'
        credential_options: { publicKey: PublicKeyCredentialRequestOptionsFuture }
      }
}

export type AuthMFAChallengeWebauthnResponse = RequestResult<
  AuthMFAChallengeResponseBase<'webauthn'> & AuthMFAChallengeWebauthnResponseFields
>

type AuthMFAChallengeWebauthnResponseFieldsJSON = {
  webauthn:
    | {
        type: 'create'
        credential_options: { publicKey: ServerCredentialCreationOptions }
      }
    | {
        type: 'request'
        credential_options: { publicKey: ServerCredentialRequestOptions }
      }
}

export type AuthMFAChallengeWebauthnResponseDataJSON = AuthMFAChallengeResponseBase<'webauthn'> &
  AuthMFAChallengeWebauthnResponseFieldsJSON

export type AuthMFAChallengeWebauthnServerResponse =
  RequestResult<AuthMFAChallengeWebauthnResponseDataJSON>

export type AuthMFAChallengeResponse =
  AuthMFAChallengeTOTPResponse | AuthMFAChallengePhoneResponse | AuthMFAChallengeWebauthnResponse

export type AuthMFAListFactorsResponse<T extends typeof FactorTypes = typeof FactorTypes> =
  RequestResult<
    {
      all: PublicFactor[]
    } & {
      [K in T[number]]: PublicFactor[]
    }
  >

export type AuthenticatorAssuranceLevels = 'aal1' | 'aal2' | (string & {})

export type AuthMFAGetAuthenticatorAssuranceLevelResponse = RequestResult<{
  currentLevel: AuthenticatorAssuranceLevels | null

  nextLevel: AuthenticatorAssuranceLevels | null

  currentAuthenticationMethods: AMREntry[] | string[]
}>

export interface MFAApi {
  enroll(params: MFAEnrollTOTPParams): Promise<AuthMFAEnrollTOTPResponse>
  enroll(params: MFAEnrollPhoneParams): Promise<AuthMFAEnrollPhoneResponse>
  enroll(params: MFAEnrollWebauthnParams): Promise<AuthMFAEnrollWebauthnResponse>
  enroll(params: MFAEnrollParams): Promise<AuthMFAEnrollResponse>

  challenge(params: MFAChallengeTOTPParams): Promise<Prettify<AuthMFAChallengeTOTPResponse>>
  challenge(params: MFAChallengePhoneParams): Promise<Prettify<AuthMFAChallengePhoneResponse>>
  challenge(params: MFAChallengeWebauthnParams): Promise<Prettify<AuthMFAChallengeWebauthnResponse>>
  challenge(params: MFAChallengeParams): Promise<AuthMFAChallengeResponse>

  verify(params: MFAVerifyTOTPParams): Promise<AuthMFAVerifyResponse>
  verify(params: MFAVerifyPhoneParams): Promise<AuthMFAVerifyResponse>
  verify(params: MFAVerifyWebauthnParams): Promise<AuthMFAVerifyResponse>
  verify(params: MFAVerifyParams): Promise<AuthMFAVerifyResponse>

  unenroll(params: MFAUnenrollParams): Promise<AuthMFAUnenrollResponse>

  challengeAndVerify(params: MFAChallengeAndVerifyParams): Promise<AuthMFAVerifyResponse>

  listFactors(): Promise<AuthMFAListFactorsResponse>

  getAuthenticatorAssuranceLevel(
    jwt?: string
  ): Promise<AuthMFAGetAuthenticatorAssuranceLevelResponse>

  webauthn: WebAuthnApi
}

export type AuthMFAAdminDeleteFactorResponse = RequestResult<{
  id: string
}>

export type AuthMFAAdminDeleteFactorParams = {
  id: string

  userId: string
}

export type AuthMFAAdminListFactorsResponse = RequestResult<{
  factors: Factor[]
}>

export type AuthMFAAdminListFactorsParams = {
  userId: string
}

export interface JupiterAuthAdminMFAApi {
  listFactors(params: AuthMFAAdminListFactorsParams): Promise<AuthMFAAdminListFactorsResponse>

  deleteFactor(params: AuthMFAAdminDeleteFactorParams): Promise<AuthMFAAdminDeleteFactorResponse>
}

type AnyFunction = (...args: any[]) => any
type MaybePromisify<T> = T | Promise<T>

type PromisifyMethods<T> = {
  [K in keyof T]: T[K] extends AnyFunction
    ? (...args: Parameters<T[K]>) => MaybePromisify<ReturnType<T[K]>>
    : T[K]
}

export type SupportedStorage = PromisifyMethods<
  Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
> & {
  isServer?: boolean
}

export type InitializeResult = { error: AuthError | null }

export type CallRefreshTokenResult = RequestResult<Session>

export type Pagination = {
  [key: string]: any
  nextPage: number | null
  lastPage: number
  total: number
}

export type PageParams = {
  page?: number

  perPage?: number
}

export type SignOut = {
  scope?: 'global' | 'local' | 'others'
}

type MFAEnrollParamsBase<T extends FactorType> = {
  factorType: T

  friendlyName?: string
}

type MFAEnrollTOTPParamFields = {
  issuer?: string
}

export type MFAEnrollTOTPParams = MFAEnrollParamsBase<'totp'> & MFAEnrollTOTPParamFields

type MFAEnrollPhoneParamFields = {
  phone: string
}
export type MFAEnrollPhoneParams = MFAEnrollParamsBase<'phone'> & MFAEnrollPhoneParamFields

type MFAEnrollWebauthnFields = {}

export type MFAEnrollWebauthnParams = MFAEnrollParamsBase<'webauthn'> & MFAEnrollWebauthnFields

type AuthMFAEnrollResponseBase<T extends FactorType> = {
  id: string

  type: T

  friendly_name?: string
}

type AuthMFAEnrollTOTPResponseFields = {
  totp: {
    qr_code: string

    secret: string

    uri: string
  }
}

export type AuthMFAEnrollTOTPResponse = RequestResult<
  AuthMFAEnrollResponseBase<'totp'> & AuthMFAEnrollTOTPResponseFields
>

type AuthMFAEnrollPhoneResponseFields = {
  phone: string
}

export type AuthMFAEnrollPhoneResponse = RequestResult<
  AuthMFAEnrollResponseBase<'phone'> & AuthMFAEnrollPhoneResponseFields
>

type AuthMFAEnrollWebauthnFields = {}

export type AuthMFAEnrollWebauthnResponse = RequestResult<
  AuthMFAEnrollResponseBase<'webauthn'> & AuthMFAEnrollWebauthnFields
>

export type JwtHeader = {
  alg: 'RS256' | 'ES256' | 'HS256' | (string & {})
  kid: string
  typ: string
}

export type RequiredClaims = {
  iss: string
  sub: string
  aud: string | string[]
  exp: number
  iat: number
  role: string
  aal: AuthenticatorAssuranceLevels
  session_id: string
}

export interface JwtPayload extends RequiredClaims {
  email?: string
  phone?: string
  is_anonymous?: boolean

  jti?: string
  nbf?: number
  app_metadata?: UserAppMetadata
  user_metadata?: UserMetadata

  amr?: AMREntry[] | string[]

  ref?: string

  [key: string]: any
}

export interface JWK {
  kty: 'RSA' | 'EC' | 'oct' | (string & {})
  key_ops: string[]
  alg?: string
  kid?: string
  [key: string]: any
}

export const SIGN_OUT_SCOPES = ['global', 'local', 'others'] as const
export type SignOutScope = (typeof SIGN_OUT_SCOPES)[number]

export type OAuthClientGrantType = 'authorization_code' | 'refresh_token' | (string & {})

export type OAuthClientResponseType = 'code'

export type OAuthClientType = 'public' | 'confidential'

export type OAuthClientRegistrationType = 'dynamic' | 'manual'

export type OAuthClientTokenEndpointAuthMethod =
  'none' | 'client_secret_basic' | 'client_secret_post'

export type OAuthClient = {
  client_id: string

  client_name: string

  client_secret?: string

  client_type: OAuthClientType

  token_endpoint_auth_method: OAuthClientTokenEndpointAuthMethod

  registration_type: OAuthClientRegistrationType

  client_uri?: string

  logo_uri?: string

  redirect_uris: string[]

  grant_types: OAuthClientGrantType[]

  response_types: OAuthClientResponseType[]

  scope?: string

  created_at: string

  updated_at: string
}

export type CreateOAuthClientParams = {
  client_name: string

  client_uri?: string

  redirect_uris: string[]

  grant_types?: OAuthClientGrantType[]

  response_types?: OAuthClientResponseType[]

  scope?: string

  token_endpoint_auth_method?: OAuthClientTokenEndpointAuthMethod
}

export type UpdateOAuthClientParams = {
  client_name?: string

  client_uri?: string

  logo_uri?: string

  redirect_uris?: string[]

  grant_types?: OAuthClientGrantType[]

  token_endpoint_auth_method?: OAuthClientTokenEndpointAuthMethod
}

export type OAuthClientResponse = RequestResult<OAuthClient>

export type OAuthClientListResponse =
  | {
      data: { clients: OAuthClient[]; aud: string } & Pagination
      error: null
    }
  | {
      data: { clients: [] }
      error: AuthError
    }

export interface GoTrueAdminOAuthApi {
  listClients(params?: PageParams): Promise<OAuthClientListResponse>

  createClient(params: CreateOAuthClientParams): Promise<OAuthClientResponse>

  getClient(clientId: string): Promise<OAuthClientResponse>

  updateClient(clientId: string, params: UpdateOAuthClientParams): Promise<OAuthClientResponse>

  deleteClient(clientId: string): Promise<{ data: null; error: AuthError | null }>

  regenerateClientSecret(clientId: string): Promise<OAuthClientResponse>
}

export type CustomProviderType = 'oauth2' | 'oidc'

export type OIDCDiscoveryDocument = {
  issuer: string

  authorization_endpoint: string

  token_endpoint: string

  jwks_uri: string

  userinfo_endpoint?: string

  revocation_endpoint?: string

  supported_scopes?: string[]

  supported_response_types?: string[]

  supported_subject_types?: string[]

  supported_id_token_signing_algs?: string[]
}

export type CustomOAuthProvider = {
  id: string

  provider_type: CustomProviderType

  identifier: string

  name: string

  client_id: string

  acceptable_client_ids?: string[]

  scopes?: string[]

  custom_claims_allowlist?: string[]

  pkce_enabled?: boolean

  attribute_mapping?: Record<string, any>

  authorization_params?: Record<string, string>

  enabled?: boolean

  email_optional?: boolean

  issuer?: string

  discovery_url?: string

  skip_nonce_check?: boolean

  authorization_url?: string

  token_url?: string

  userinfo_url?: string

  jwks_uri?: string

  discovery_document?: OIDCDiscoveryDocument | null

  created_at: string

  updated_at: string
}

export type CreateCustomProviderParams = {
  provider_type: CustomProviderType

  identifier: string

  name: string

  client_id: string

  client_secret: string

  acceptable_client_ids?: string[]

  scopes?: string[]

  custom_claims_allowlist?: string[]

  pkce_enabled?: boolean

  attribute_mapping?: Record<string, any>

  authorization_params?: Record<string, string>

  enabled?: boolean

  email_optional?: boolean

  issuer?: string

  discovery_url?: string

  skip_nonce_check?: boolean

  authorization_url?: string

  token_url?: string

  userinfo_url?: string

  jwks_uri?: string
}

export type UpdateCustomProviderParams = {
  name?: string

  client_id?: string

  client_secret?: string

  acceptable_client_ids?: string[]

  scopes?: string[]

  custom_claims_allowlist?: string[]

  pkce_enabled?: boolean

  attribute_mapping?: Record<string, any>

  authorization_params?: Record<string, string>

  enabled?: boolean

  email_optional?: boolean

  issuer?: string

  discovery_url?: string

  skip_nonce_check?: boolean

  authorization_url?: string

  token_url?: string

  userinfo_url?: string

  jwks_uri?: string
}

export type ListCustomProvidersParams = {
  type?: CustomProviderType
}

export type CustomProviderResponse = RequestResult<CustomOAuthProvider>

export type CustomProviderListResponse =
  | {
      data: { providers: CustomOAuthProvider[] }
      error: null
    }
  | {
      data: { providers: [] }
      error: AuthError
    }

export interface GoTrueAdminCustomProvidersApi {
  listProviders(params?: ListCustomProvidersParams): Promise<CustomProviderListResponse>

  createProvider(params: CreateCustomProviderParams): Promise<CustomProviderResponse>

  getProvider(identifier: string): Promise<CustomProviderResponse>

  updateProvider(
    identifier: string,
    params: UpdateCustomProviderParams
  ): Promise<CustomProviderResponse>

  deleteProvider(identifier: string): Promise<{ data: null; error: AuthError | null }>
}

export type OAuthAuthorizationClient = {
  id: string

  name: string

  uri: string

  logo_uri: string
}

export type OAuthAuthorizationDetails = {
  authorization_id: string

  redirect_uri: string

  client: OAuthAuthorizationClient

  user: {
    id: string

    email: string
  }

  scope: string
}

export type OAuthRedirect = {
  redirect_url: string
}

export type AuthOAuthAuthorizationDetailsResponse = RequestResult<
  OAuthAuthorizationDetails | OAuthRedirect
>

export type AuthOAuthConsentResponse = RequestResult<OAuthRedirect>

export type OAuthGrant = {
  client: OAuthAuthorizationClient

  scopes: string[]

  granted_at: string
}

export type AuthOAuthGrantsResponse = RequestResult<OAuthGrant[]>

export type AuthOAuthRevokeGrantResponse = RequestResult<{}>

export interface AuthOAuthServerApi {
  getAuthorizationDetails(authorizationId: string): Promise<AuthOAuthAuthorizationDetailsResponse>

  approveAuthorization(
    authorizationId: string,
    options?: { skipBrowserRedirect?: boolean }
  ): Promise<AuthOAuthConsentResponse>

  denyAuthorization(
    authorizationId: string,
    options?: { skipBrowserRedirect?: boolean }
  ): Promise<AuthOAuthConsentResponse>

  listGrants(): Promise<AuthOAuthGrantsResponse>

  revokeGrant(options: { clientId: string }): Promise<AuthOAuthRevokeGrantResponse>
}

export type PasskeyRegistrationOptionsResponse = {
  challenge_id: string
  options: ServerCredentialCreationOptions
  expires_at: number
}

export type PasskeyRegistrationVerifyParams = {
  challenge_id: string
  credential: RegistrationResponseJSON
}

export type PasskeyMetadata = {
  id: string
  friendly_name?: string
  created_at: string
}

export type PasskeyAuthenticationOptionsResponse = {
  challenge_id: string
  options: ServerCredentialRequestOptions
  expires_at: number
}

export type PasskeyAuthenticationVerifyParams = {
  challenge_id: string
  credential: AuthenticationResponseJSON
}

export type PasskeyListItem = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export type SignInWithPasskeyCredentials = {
  options?: {
    captchaToken?: string
    signal?: AbortSignal
  }
}

export type RegisterPasskeyCredentials = {
  options?: {
    signal?: AbortSignal
  }
}

export type VerifyPasskeyRegistrationParams = {
  challengeId: string

  credential: ServerCredentialResponse
}

export type StartPasskeyAuthenticationParams = {
  options?: {
    captchaToken?: string
  }
}

export type VerifyPasskeyAuthenticationParams = {
  challengeId: string

  credential: ServerCredentialResponse
}

export type PasskeyUpdateParams = {
  passkeyId: string

  friendlyName: string
}

export type PasskeyDeleteParams = {
  passkeyId: string
}

export type AuthPasskeyRegistrationOptionsResponse =
  RequestResult<PasskeyRegistrationOptionsResponse>
export type AuthPasskeyRegistrationVerifyResponse = RequestResult<
  PasskeyMetadata,
  WebAuthnError | AuthError
>
export type AuthPasskeyAuthenticationOptionsResponse =
  RequestResult<PasskeyAuthenticationOptionsResponse>
export type AuthPasskeyAuthenticationVerifyResponse = RequestResult<
  { session: Session | null; user: User | null },
  WebAuthnError | AuthError
>
export type AuthPasskeyListResponse = RequestResult<PasskeyListItem[]>
export type AuthPasskeyUpdateResponse = RequestResult<PasskeyListItem>
export type AuthPasskeyDeleteResponse = RequestResult<null>

export type AuthPasskeyAdminListParams = {
  userId: string
}

export type AuthPasskeyAdminDeleteParams = {
  userId: string
  passkeyId: string
}

export interface AuthPasskeyApi {
  startRegistration(): Promise<AuthPasskeyRegistrationOptionsResponse>

  verifyRegistration(
    params: VerifyPasskeyRegistrationParams
  ): Promise<AuthPasskeyRegistrationVerifyResponse>

  startAuthentication(
    params?: StartPasskeyAuthenticationParams
  ): Promise<AuthPasskeyAuthenticationOptionsResponse>

  verifyAuthentication(
    params: VerifyPasskeyAuthenticationParams
  ): Promise<AuthPasskeyAuthenticationVerifyResponse>

  list(): Promise<AuthPasskeyListResponse>

  update(params: PasskeyUpdateParams): Promise<AuthPasskeyUpdateResponse>

  delete(params: PasskeyDeleteParams): Promise<AuthPasskeyDeleteResponse>
}

export interface GoTrueAdminPasskeyApi {
  listPasskeys(params: AuthPasskeyAdminListParams): Promise<AuthPasskeyListResponse>

  deletePasskey(params: AuthPasskeyAdminDeleteParams): Promise<AuthPasskeyDeleteResponse>
}
