import type { JsonObject } from '@jupiter-cloud/core'
import type { ChallengeId, FactorId, FactorType, UserId } from './primitives'
import type { PublicUser, TotpObject, WeakPassword, WebAuthnChallengeData } from './models'

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

/** MFA enrollment response. */
export type EnrollFactorResponse = {
  id?: FactorId
  type?: FactorType
  display_name?: string
  totp?: TotpObject
  phone?: string
}

/** MFA factor challenge response. */
export type ChallengeFactorResponse = {
  id?: ChallengeId
  type?: FactorType
  expires_at?: number
  webauthn?: WebAuthnChallengeData
}

/** MFA factor unenrollment response. */
export type UnenrollFactorResponse = {
  id: FactorId
}

/** Admin user list response. */
export type AdminListUsersResponse = {
  users: PublicUser[]
}
