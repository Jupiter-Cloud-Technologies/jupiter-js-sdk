import type { JsonObject } from '@jupiter-cloud/core'
import type { ChallengeId, FactorId, FactorType, UserId } from './primitives'
import type { PublicUser, TotpObject, WeakPassword, WebAuthnChallengeData } from './models'
import type { AuthError } from '../internal/errors'
import type { Provider } from './providers'

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

/**
 * similar to RequestResult except it allows you to destructure the possible shape of the success response
 */
export type RequestResultSafeDestructure<T> =
  | { data: T; error: null }
  | {
      data: T extends object ? { [K in keyof T]: null } : null
      error: AuthError
    }

export type AuthResponse = RequestResultSafeDestructure<{
  user: PublicUser | null
  session: AccessTokenResponse | null
}>

export type AuthTokenResponsePassword = RequestResultSafeDestructure<{
  user: PublicUser
  session: AccessTokenResponse
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

export type AuthResponsePassword = RequestResultSafeDestructure<{
  user: PublicUser | null
  session: AccessTokenResponse | null
  weak_password?: WeakPassword | null
}>

export type AuthTokenResponse = RequestResultSafeDestructure<{
  user: PublicUser
  session: AccessTokenResponse
}>

/**
 * AuthOtpResponse is returned when OTP is used.
 *
 */
export type AuthOtpResponse = RequestResultSafeDestructure<{
  user: null
  session: null
  messageId?: string | null
}>

/**
 * a shared result type that encapsulates errors instead of throwing them, allows you to optionally specify the ErrorType
 */
export type RequestResult<T, ErrorType extends Error = AuthError> =
  | {
      data: T
      error: null
    }
  | {
      data: null
      error: Error extends AuthError ? AuthError : ErrorType
    }

export type CallRefreshTokenResult = RequestResult<AccessTokenResponse>

export type UserResponse = RequestResultSafeDestructure<{
  user: PublicUser
}>

export type AuthMFAUnenrollResponse = RequestResult<{
  /** ID of the factor that was successfully unenrolled. */
  id: string
}>

export type AuthMFAEnrollTOTPResponse = RequestResult<
  AuthMFAEnrollResponseBase<'totp'> & AuthMFAEnrollTOTPResponseFields
>
type AuthMFAEnrollResponseBase<T extends FactorType> = {
  /** ID of the factor that was just enrolled (in an unverified state). */
  id: string

  /** Type of MFA factor.*/
  type: T

  /** Friendly name of the factor, useful for distinguishing between factors **/
  friendly_name?: string
}

type AuthMFAEnrollTOTPResponseFields = {
  /** TOTP enrollment information. */
  totp: {
    /** Contains a QR code encoding the authenticator URI. You can
     * convert it to a URL by prepending `data:image/svg+xml;utf-8,` to
     * the value. Avoid logging this value to the console. */
    qr_code: string

    /** The TOTP secret (also encoded in the QR code). Show this secret
     * in a password-style field to the user, in case they are unable to
     * scan the QR code. Avoid logging this value to the console. */
    secret: string

    /** The authenticator URI encoded within the QR code, should you need
     * to use it. Avoid loggin this value to the console. */
    uri: string
  }
}

type AuthMFAEnrollPhoneResponseFields = {
  /** Phone number of the MFA factor in E.164 format. Used to send messages  */
  phone: string
}

export type AuthMFAEnrollPhoneResponse = RequestResult<
  AuthMFAEnrollResponseBase<'phone'> & AuthMFAEnrollPhoneResponseFields
>

type AuthMFAEnrollWebauthnFields = {
  /** no extra fields for now, kept for consistency and for possible future changes  */
}

/**
 * Response type for WebAuthn factor enrollment.
 * Returns the enrolled factor ID and metadata.
 * @see {@link https://w3c.github.io/webauthn/#sctn-registering-a-new-credential W3C WebAuthn Spec - Registering a New Credential}
 */
export type AuthMFAEnrollWebauthnResponse = RequestResult<
  AuthMFAEnrollResponseBase<'webauthn'> & AuthMFAEnrollWebauthnFields
>

/**
 * Data returned after successful MFA verification.
 * Contains new session tokens and updated user information.
 */
export type AuthMFAVerifyResponseData = {
  /** New access token (JWT) after successful verification. */
  access_token: string

  /** Type of token, always `bearer`. */
  token_type: 'bearer'

  /** Number of seconds in which the access token will expire. */
  expires_in: number

  /** Refresh token you can use to obtain new access tokens when expired. */
  refresh_token: string

  /** Updated user profile. */
  user: PublicUser
}

/**
 * Response type for MFA verification operations.
 * Returns session tokens on successful verification.
 */
export type AuthMFAVerifyResponse = RequestResult<AuthMFAVerifyResponseData>
