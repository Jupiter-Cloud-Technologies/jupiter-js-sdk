import type { JsonObject } from '@jupiter-cloud/core'
import type {
  ChallengeId,
  Channel,
  CodeChallengeMethod,
  FactorType,
  OAuthProvider,
  ResendType,
  UserId,
  VerificationType
} from './primitives'
import type { WebAuthnParams } from './models'
import type { Provider } from './providers'
import type {
  AuthMFAEnrollPhoneResponse,
  AuthMFAEnrollTOTPResponse,
  AuthMFAEnrollWebauthnResponse
} from './outputs'

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

/** Logout scope. */
export type LogoutScope = 'global' | 'local' | 'others'

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

/** MFA factor challenge request body. */
export type ChallengeFactorRequest = {
  channel?: Channel | undefined
  webauthn?: WebAuthnParams | undefined
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

export type SignUpWithPhoneRequest = {
  phone: string
  password: string
  attributes?: JsonObject
  options?: {
    emailRedirectTo?: string // only for email
    captchaToken?: string
  }
}

export type SignUpWithPasswordRequest = {
  email: string
  password: string
  attributes?: JsonObject
  options?: {
    emailRedirectTo?: string // only for email
    captchaToken?: string
  }
}

export interface UserAttributes {
  /**
   * The user's current password
   *
   * This is only ever present when the user is resetting
   * their password and GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD is true.
   *
   */
  current_password?: string

  /**
   * The user's email.
   */
  email?: string

  /**
   * The user's phone.
   */
  phone?: string

  /**
   * The user's password.
   */
  password?: string

  /**
   * The nonce sent for reauthentication if the user's password is to be updated.
   *
   * Call reauthenticate() to obtain the nonce first.
   */
  nonce?: string

  /**
   * A custom data object to store the user's metadata. This maps to the `auth.users.raw_user_meta_data` column.
   *
   * The `data` should be a JSON object that includes user-specific info, such as their first and last name.
   *
   */
  data?: object
}

export interface AdminUserAttributesParams {
  attributes?: object
  system_attributes?: object
  email_confirm?: boolean
  phone_confirm?: boolean
  /**
   * The user's email.
   */
  email?: string

  /**
   * The user's phone.
   */
  phone?: string

  /**
   * The user's password.
   */
  password?: string

  /**
   * The nonce sent for reauthentication if the user's password is to be updated.
   *
   * Call reauthenticate() to obtain the nonce first.
   */
  nonce?: string
}

type PasswordCredentialsBase =
  { email: string; password: string } | { phone: string; password: string }

export type SignInWithPasswordCredentials = PasswordCredentialsBase & {
  options?: {
    captchaToken?: string
  }
}

export type SignInWithEmailAndPasswordRequest = {
  email: string
  password: string
  options?: {
    captchaToken?: string
  }
}

export type SignInWithPhoneAndPasswordRequest = {
  phone: string
  password: string
  options?: {
    captchaToken?: string
  }
}

export type SignInWithOAuthRequest = {
  /** One of the providers supported by GoTrue. */
  provider: Provider
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string
    /** A space-separated list of scopes granted to the OAuth application. */
    scopes?: string
    /** An object of query params */
    queryParams?: { [key: string]: string }
    /** If set to true does not immediately redirect the current browser context to visit the OAuth authorization page for the provider. */
    skipBrowserRedirect?: boolean
  }
}

export type SignInWithIdTokenRequest = {
  /** Provider name or OIDC `iss` value identifying which provider should be used to verify the provided token. Supported names: `google`, `apple`, `azure`, `facebook`, `kakao`. Use the `custom:` prefix for custom OIDC providers (e.g. `custom:my-oidc-provider`). */
  provider: 'google' | 'apple' | 'azure' | 'facebook' | 'kakao' | `custom:${string}` | (string & {})
  /** OIDC ID token issued by the specified provider. The `iss` claim in the ID token must match the supplied provider. Some ID tokens contain an `at_hash` which require that you provide an `access_token` value to be accepted properly. If the token contains a `nonce` claim you must supply the nonce used to obtain the ID token. */
  token: string
  /** If the ID token contains an `at_hash` claim, then the hash of this value is compared to the value in the ID token. */
  access_token?: string
  /** If the ID token contains a `nonce` claim, then the hash of this value is compared to the value in the ID token. */
  nonce?: string
  options?: {
    /** Verification token received when the user completes the captcha on the site. */
    captchaToken?: string
  }
}

export type signInWithEmailCredentials = {
  email: string
  attributes?: JsonObject
  createIfNotExists?: boolean
  options?: {
    /** The redirect url embedded in the email link */
    emailRedirectTo?: string
    /** If set to false, this method will not create a new user. Defaults to true. */
    /**
     * A custom data object to store the user's metadata. This maps to the `auth.users.raw_user_meta_data` column.
     *
     * The `data` should be a JSON object that includes user-specific info, such as their first and last name.
     */
    /** Verification token received when the user completes the captcha on the site. */
    captchaToken?: string
  }
}

export type signInWithPhoneCredentials = {
  phone: string
  attributes?: JsonObject
  createIfNotExists?: boolean
  options?: {
    /** The redirect url embedded in the email link */
    emailRedirectTo?: string
    /** If set to false, this method will not create a new user. Defaults to true. */
    /**
     * A custom data object to store the user's metadata. This maps to the `auth.users.raw_user_meta_data` column.
     *
     * The `data` should be a JSON object that includes user-specific info, such as their first and last name.
     */
    /** Verification token received when the user completes the captcha on the site. */
    captchaToken?: string
  }
}

export type SignInWithPasswordlessCredentials =
  | {
      /** The user's email address. */
      email: string
      options?: {
        /** The redirect url embedded in the email link */
        emailRedirectTo?: string
        /** If set to false, this method will not create a new user. Defaults to true. */
        shouldCreateUser?: boolean
        /**
         * A custom data object to store the user's metadata. This maps to the `auth.users.raw_user_meta_data` column.
         *
         * The `data` should be a JSON object that includes user-specific info, such as their first and last name.
         */
        data?: object
        /** Verification token received when the user completes the captcha on the site. */
        captchaToken?: string
      }
    }
  | {
      /** The user's phone number. */
      phone: string
      options?: {
        /** If set to false, this method will not create a new user. Defaults to true. */
        shouldCreateUser?: boolean
        /**
         * A custom data object to store the user's metadata. This maps to the `auth.users.raw_user_meta_data` column.
         *
         * The `data` should be a JSON object that includes user-specific info, such as their first and last name.
         */
        data?: object
        /** Verification token received when the user completes the captcha on the site. */
        captchaToken?: string
        /** Messaging channel to use (e.g. whatsapp or sms) */
        channel?: 'sms' | 'whatsapp'
      }
    }

export interface VerifySignupConfirmParams {
  /**The user's phone number. */
  phone?: string
  /** The user's email address. */
  email?: string
  /** The otp sent to the user's email address. */
  token: string
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string

    /** Verification token received when the user completes the captcha on the site.
     *
     * @deprecated
     */
    captchaToken?: string
  }
}

export interface VerifySigninConfirmParams {
  /**The user's phone number. */
  phone?: string
  /** The user's email address. */
  email?: string
  /** The otp sent to the user's email address. */
  token: string
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string

    /** Verification token received when the user completes the captcha on the site.
     *
     * @deprecated
     */
    captchaToken?: string
  }
}

export interface VerifyPasswordRecoveryParams {
  /** The user's email address. */
  email: string
  /** The otp sent to the user's email address. */
  token: string
  /** new password */
  new_password: string
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string

    /** Verification token received when the user completes the captcha on the site.
     *
     * @deprecated
     */
    captchaToken?: string
  }
}

export interface InviteConfirmParams {
  /** The user's email address. */
  email?: string
  /** The otp sent to the user's email address. */
  token: string
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string

    /** Verification token received when the user completes the captcha on the site.
     *
     * @deprecated
     */
    captchaToken?: string
  }
}

export interface AttributeChangeConfirmParams {
  /** The name of the attribute to change. email or phone. */
  attribute_name?: string
  /** The otp sent to the user's email address. */
  token: string
  email?: string
  phone?: string
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string

    /** Verification token received when the user completes the captcha on the site.
     *
     * @deprecated
     */
    captchaToken?: string
  }
}

/**
 * A stricter version of TypeScript's Omit that only allows omitting keys that actually exist.
 * This prevents typos and ensures type safety at compile time.
 * Unlike regular Omit, this will error if you try to omit a non-existent key.
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>

export interface UserAttributes {
  /**
   * The user's current password
   *
   * This is only ever present when the user is resetting
   * their password and GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD is true.
   *
   */
  current_password?: string

  /**
   * The user's email.
   */
  email?: string

  /**
   * The user's phone.
   */
  phone?: string

  /**
   * The user's password.
   */
  password?: string

  /**
   * The nonce sent for reauthentication if the user's password is to be updated.
   *
   * Call reauthenticate() to obtain the nonce first.
   */
  nonce?: string

  /**
   * A custom data object to store the user's metadata. This maps to the `auth.users.raw_user_meta_data` column.
   *
   * The `data` should be a JSON object that includes user-specific info, such as their first and last name.
   *
   */
  attributes?: object
}

export type MFAUnenrollParams = {
  /** ID of the factor being unenrolled. */
  factorId: string
}

export type SignOut = {
  /**
   * Determines which sessions should be
   * logged out. Global means all
   * sessions by this account. Local
   * means only this session. Others
   * means all other sessions except the
   * current one. When using others,
   * there is no sign-out event fired on
   * the current session!
   */
  target?: 'global' | 'local' | 'others'
}

export type SignInWithIdTokenCredentials = {
  /** Provider name or OIDC `iss` value identifying which provider should be used to verify the provided token. Supported names: `google`, `apple`, `azure`, `facebook`, `kakao`. Use the `custom:` prefix for custom OIDC providers (e.g. `custom:my-oidc-provider`). */
  provider: 'google' | 'apple' | 'azure' | 'facebook' | 'kakao' | `custom:${string}` | (string & {})
  /** OIDC ID token issued by the specified provider. The `iss` claim in the ID token must match the supplied provider. Some ID tokens contain an `at_hash` which require that you provide an `access_token` value to be accepted properly. If the token contains a `nonce` claim you must supply the nonce used to obtain the ID token. */
  token: string
  /** If the ID token contains an `at_hash` claim, then the hash of this value is compared to the value in the ID token. */
  access_token?: string
  /** If the ID token contains a `nonce` claim, then the hash of this value is compared to the value in the ID token. */
  nonce?: string
  options?: {
    /** Verification token received when the user completes the captcha on the site. */
    captchaToken?: string
  }
}

export type SignInWithOAuthCredentials = {
  /** One of the providers supported by GoTrue. */
  provider: Provider
  options?: {
    /** A URL to send the user to after they are confirmed. */
    redirectTo?: string
    /** A space-separated list of scopes granted to the OAuth application. */
    scopes?: string
    /** An object of query params */
    queryParams?: { [key: string]: string }
    /** If set to true does not immediately redirect the current browser context to visit the OAuth authorization page for the provider. */
    skipBrowserRedirect?: boolean
  }
}

export type MFAEnrollTOTPParams = MFAEnrollParamsBase<'totp'> & MFAEnrollTOTPParamFields

type MFAEnrollPhoneParamFields = {
  /** Phone number associated with a factor. Number should conform to E.164 format */
  phone: string
}
export type MFAEnrollPhoneParams = MFAEnrollParamsBase<'phone'> & MFAEnrollPhoneParamFields

type MFAEnrollWebauthnFields = {
  /** no extra fields for now, kept for consistency and for possible future changes  */
}

type MFAEnrollParamsBase<T extends FactorType> = {
  /** The type of factor being enrolled. */
  factorType: T
  /** Human readable name assigned to the factor. */
  friendlyName?: string
}

type MFAEnrollTOTPParamFields = {
  /** Domain which the user is enrolled with. */
  issuer?: string
}

export type MFAEnrollWebauthnParams = MFAEnrollParamsBase<'webauthn'> & MFAEnrollWebauthnFields

export type MFAEnrollParams = MFAEnrollTOTPParams | MFAEnrollPhoneParams | MFAEnrollWebauthnParams

export type AuthMFAEnrollResponse =
  AuthMFAEnrollTOTPResponse | AuthMFAEnrollPhoneResponse | AuthMFAEnrollWebauthnResponse

type MFAVerifyParamsBase = {
  /** ID of the factor being verified. Returned in enroll(). */
  factorId: string
  /** ID of the challenge being verified. Returned in challenge(). */
  challengeId: string
}

type MFAVerifyTOTPParamFields = {
  /** Verification code provided by the user. */
  code: string
}

export type MFAVerifyTOTPParams = MFAVerifyParamsBase & MFAVerifyTOTPParamFields

type MFAVerifyPhoneParamFields = MFAVerifyTOTPParamFields

export type MFAVerifyPhoneParams = MFAVerifyParamsBase & MFAVerifyPhoneParamFields
