/**
 * Known error codes. Note that the server may also return other error codes
 * not included in this list (if the SDK is older than the version
 * on the server).
 */
export type ErrorCode =
  | 'unexpected_failure'
  | 'validation_failed'
  | 'bad_json'
  | 'email_exists'
  | 'phone_exists'
  | 'bad_jwt'
  | 'not_admin'
  | 'no_authorization'
  | 'user_not_found'
  | 'session_not_found'
  | 'session_expired'
  | 'refresh_token_not_found'
  | 'refresh_token_already_used'
  | 'flow_state_not_found'
  | 'flow_state_expired'
  | 'signup_disabled'
  | 'user_banned'
  | 'provider_email_needs_verification'
  | 'invite_not_found'
  | 'bad_oauth_state'
  | 'bad_oauth_callback'
  | 'oauth_provider_not_supported'
  | 'unexpected_audience'
  | 'single_identity_not_deletable'
  | 'email_conflict_identity_not_deletable'
  | 'identity_already_exists'
  | 'email_provider_disabled'
  | 'phone_provider_disabled'
  | 'too_many_enrolled_mfa_factors'
  | 'mfa_factor_name_conflict'
  | 'mfa_factor_not_found'
  | 'mfa_ip_address_mismatch'
  | 'mfa_challenge_expired'
  | 'mfa_verification_failed'
  | 'mfa_verification_rejected'
  | 'insufficient_aal'
  | 'captcha_failed'
  | 'saml_provider_disabled'
  | 'manual_linking_disabled'
  | 'sms_send_failed'
  | 'email_not_confirmed'
  | 'phone_not_confirmed'
  | 'reauth_nonce_missing'
  | 'saml_relay_state_not_found'
  | 'saml_relay_state_expired'
  | 'saml_idp_not_found'
  | 'saml_assertion_no_user_id'
  | 'saml_assertion_no_email'
  | 'user_already_exists'
  | 'sso_provider_not_found'
  | 'saml_metadata_fetch_failed'
  | 'saml_idp_already_exists'
  | 'sso_domain_already_exists'
  | 'saml_entity_id_mismatch'
  | 'conflict'
  | 'provider_disabled'
  | 'user_sso_managed'
  | 'reauthentication_needed'
  | 'same_password'
  | 'reauthentication_not_valid'
  | 'otp_expired'
  | 'otp_disabled'
  | 'identity_not_found'
  | 'weak_password'
  | 'over_request_rate_limit'
  | 'over_email_send_rate_limit'
  | 'over_sms_send_rate_limit'
  | 'bad_code_verifier'
  | 'anonymous_provider_disabled'
  | 'hook_timeout'
  | 'hook_timeout_after_retry'
  | 'hook_payload_over_size_limit'
  | 'hook_payload_invalid_content_type'
  | 'request_timeout'
  | 'mfa_phone_enroll_not_enabled'
  | 'mfa_phone_verify_not_enabled'
  | 'mfa_totp_enroll_not_enabled'
  | 'mfa_totp_verify_not_enabled'
  | 'mfa_webauthn_enroll_not_enabled'
  | 'mfa_webauthn_verify_not_enabled'
  | 'mfa_verified_factor_exists'
  | 'invalid_credentials'
  | 'email_address_not_authorized'
  | 'email_address_invalid'

/**
 * Base error thrown by Jupiter Auth helpers.
 *
 */
export class AuthError extends Error {
  /**
   * Error code associated with the error. Most errors coming from
   * HTTP responses will have a code, though some errors that occur
   * before a response is received will not have one present. In that
   * case {@link #status} will also be undefined.
   */
  code: ErrorCode | (string & {}) | undefined

  /** HTTP status code that caused the error. */
  status: number | undefined

  protected __isAuthError = true

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.code = code
  }

  toJSON(): {
    name: string
    message: string
    status: number | undefined
    code: ErrorCode | (string & {}) | undefined
  } {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code
    }
  }
}

/**
 * Flexible error class used to create named auth errors at runtime.
 *
 */
export class CustomAuthError extends AuthError {
  override name: string
  override status: number

  constructor(message: string, name: string, status: number, code: string | undefined) {
    super(message, status, code)
    this.name = name
    this.status = status
  }
}

/**
 * Error thrown when a transient fetch issue occurs.
 *
 */
export class AuthRetryableFetchError extends CustomAuthError {
  constructor(message: string, status: number) {
    super(message, 'AuthRetryableFetchError', status, undefined)
  }
}

export class AuthUnknownError extends AuthError {
  originalError: unknown

  constructor(message: string, originalError: unknown) {
    super(message)
    this.name = 'AuthUnknownError'
    this.originalError = originalError
  }
}

const WeakPasswordReasons = ['length', 'characters', 'pwned'] as const

export type WeakPasswordReasons = (typeof WeakPasswordReasons)[number]
export type WeakPassword = {
  reasons: WeakPasswordReasons[]
  message: string
}

/**
 * This error is thrown on certain methods when the password used is deemed
 * weak. Inspect the reasons to identify what password strength rules are
 * inadequate.
 */
/**
 * Error thrown when a supplied password is considered weak.
 *
 */
export class AuthWeakPasswordError extends CustomAuthError {
  /**
   * Reasons why the password is deemed weak.
   */
  reasons: WeakPasswordReasons[]

  constructor(message: string, status: number, reasons: WeakPasswordReasons[]) {
    super(message, 'AuthWeakPasswordError', status, 'weak_password')

    this.reasons = reasons
  }

  override toJSON(): {
    name: string
    message: string
    status: number | undefined
    code: ErrorCode | (string & {}) | undefined
    reasons: WeakPasswordReasons[]
  } {
    return {
      ...super.toJSON(),
      reasons: this.reasons
    }
  }
}

/**
 * Error thrown when an operation requires a session but none is present.
 *
 */
export class AuthSessionMissingError extends CustomAuthError {
  constructor() {
    super('Auth session missing!', 'AuthSessionMissingError', 400, undefined)
  }
}

/**
 * Error returned directly from the Jupiter Auth API.
 *
 */
export class AuthApiError extends AuthError {
  override status: number

  constructor(message: string, status: number, code: string | undefined) {
    super(message, status, code)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && '__isAuthError' in error
}

/**
 * Error thrown when the token response is malformed.
 *
 */
export class AuthInvalidTokenResponseError extends CustomAuthError {
  constructor() {
    super('Auth session or user missing', 'AuthInvalidTokenResponseError', 500, undefined)
  }
}

/**
 * Error thrown when email/password credentials are invalid.
 *
 */
export class AuthInvalidCredentialsError extends CustomAuthError {
  constructor(message: string) {
    super(message, 'AuthInvalidCredentialsError', 400, undefined)
  }
}

/**
 * Error thrown when the PKCE code verifier is not found in storage.
 * This typically happens when the auth flow was initiated in a different
 * browser, device, or the storage was cleared.
 *
 */
export class AuthPKCECodeVerifierMissingError extends CustomAuthError {
  constructor() {
    super(
      'PKCE code verifier not found in storage. ' +
        'This can happen if the auth flow was initiated in a different browser or device, ' +
        'or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), ' +
        'use Jupiter cookie storage on both the server and client to store the code verifier in cookies.',
      'AuthPKCECodeVerifierMissingError',
      400,
      'pkce_code_verifier_not_found'
    )
  }
}

export function isAuthRetryableFetchError(error: unknown): error is AuthRetryableFetchError {
  return isAuthError(error) && error.name === 'AuthRetryableFetchError'
}

/**
 * Returned when the server rotated a refresh token successfully but the
 * client chose not to persist the rotated tokens because the local session
 * changed mid-flight. Usually means a concurrent `signOut` cleared storage
 * between when the refresh started and when it came back.
 *
 * Set on the `error` field of the refresh result so callers can tell "we
 * got rotated tokens but threw them away" apart from "the refresh failed."
 * The rotated session on the server will be picked up on the next refresh
 * via the server's parent-of-active path.
 *
 */
export class AuthRefreshDiscardedError extends CustomAuthError {
  constructor(
    message = 'Refresh result discarded: session state changed mid-flight (e.g., concurrent signOut)'
  ) {
    super(message, 'AuthRefreshDiscardedError', 409, undefined)
  }
}

export function isAuthSessionMissingError(error: any): error is AuthSessionMissingError {
  return isAuthError(error) && error.name === 'AuthSessionMissingError'
}

/**
 * Error thrown when a JWT cannot be verified or parsed.
 *
 */
export class AuthInvalidJwtError extends CustomAuthError {
  constructor(message: string) {
    super(message, 'AuthInvalidJwtError', 400, 'invalid_jwt')
  }
}

/**
 * Error thrown when implicit grant redirects contain an error.
 *
 */
export class AuthImplicitGrantRedirectError extends CustomAuthError {
  details: { error: string; code: string } | null = null
  constructor(message: string, details: { error: string; code: string } | null = null) {
    super(message, 'AuthImplicitGrantRedirectError', 500, undefined)
    this.details = details
  }

  override toJSON(): {
    name: string
    message: string
    status: number | undefined
    code: ErrorCode | (string & {}) | undefined
    details: { error: string; code: string } | null
  } {
    return {
      ...super.toJSON(),
      details: this.details
    }
  }
}

/**
 * Error thrown during PKCE code exchanges.
 *
 */
export class AuthPKCEGrantCodeExchangeError extends CustomAuthError {
  details: { error: string; code: string } | null = null

  constructor(message: string, details: { error: string; code: string } | null = null) {
    super(message, 'AuthPKCEGrantCodeExchangeError', 500, undefined)
    this.details = details
  }

  override toJSON(): {
    name: string
    message: string
    status: number | undefined
    code: ErrorCode | (string & {}) | undefined
    details: { error: string; code: string } | null
  } {
    return {
      ...super.toJSON(),
      details: this.details
    }
  }
}

export function isAuthApiError(error: unknown): error is AuthApiError {
  return isAuthError(error) && error.name === 'AuthApiError'
}

export function isAuthRefreshDiscardedError(error: unknown): error is AuthRefreshDiscardedError {
  return isAuthError(error) && error.name === 'AuthRefreshDiscardedError'
}
