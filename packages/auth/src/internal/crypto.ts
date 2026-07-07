import type { RequestResult } from '../types'
import { base64UrlToUint8Array, stringFromBase64URL } from './base64'
import { BASE64URL_REGEX } from './constants'
import { AuthInvalidJwtError } from './errors'

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

export type AuthenticatorAssuranceLevels = 'aal1' | 'aal2' | (string & {})

export type AuthMFAGetAuthenticatorAssuranceLevelResponse = RequestResult<{
  /** Current AAL level of the session. */
  currentLevel: AuthenticatorAssuranceLevels | null

  /**
   * Next possible AAL level for the session. If the next level is higher
   * than the current one, the user should go through MFA.
   *
   * @see {@link GoTrueMFAApi#challenge}
   */
  nextLevel: AuthenticatorAssuranceLevels | null

  /**
   * A list of all authentication methods attached to this session. Use
   * the information here to detect the last time a user verified a
   * factor, for example if implementing a step-up scenario.
   *
   * Supports both RFC-8176 compliant format (string[]) and detailed format (AMREntry[]).
   * - String format: ['password', 'otp'] - RFC-8176 compliant
   * - Object format: [{ method: 'password', timestamp: 1234567890 }] - includes timestamps
   */
  currentAuthenticationMethods: AMREntry[] | string[]
}>

/**
 * An authentication method reference (AMR) entry.
 *
 * An entry designates what method was used by the user to verify their
 * identity and at what time.
 *
 * Note: Custom access token hooks can return AMR claims as either:
 * - An array of AMREntry objects (detailed format with timestamps)
 * - An array of strings (RFC-8176 compliant format)
 *
 * @see {@link GoTrueMFAApi#getAuthenticatorAssuranceLevel}.
 */
export interface AMREntry {
  /** Authentication method name. */
  method: AMRMethod

  /**
   * Timestamp when the method was successfully used. Represents number of
   * seconds since 1st January 1970 (UNIX epoch) in UTC.
   */
  timestamp: number
}

export type AMRMethod = (typeof AMRMethods)[number] | (string & {})

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

export interface UserMetadata {
  [key: string]: any
}

export interface UserAppMetadata {
  /**
   * The first provider that the user used to sign up with.
   */
  provider?: string
  /**
   * A list of all providers that the user has linked to their account.
   */
  providers?: string[]
  [key: string]: any
}

/**
 * JWT Payload containing claims for Supabase authentication tokens.
 *
 * Required claims (iss, aud, exp, iat, sub, role, aal, session_id) are inherited from RequiredClaims.
 * All other claims are optional as they can be customized via Custom Access Token Hooks.
 *
 * @see https://supabase.com/docs/guides/auth/jwt-fields
 */
export interface JwtPayload extends RequiredClaims {
  // Standard optional claims (can be customized via custom access token hooks)
  email?: string
  phone?: string
  is_anonymous?: boolean

  // Optional claims
  jti?: string
  nbf?: number
  app_metadata?: UserAppMetadata
  user_metadata?: UserMetadata
  /**
   * Authentication Method References.
   * Supports both RFC-8176 compliant format (string[]) and detailed format (AMREntry[]).
   * - String format: ['password', 'otp'] - RFC-8176 compliant
   * - Object format: [{ method: 'password', timestamp: 1234567890 }] - includes timestamps
   */
  amr?: AMREntry[] | string[]

  // Special claims (only in anon/service role tokens)
  ref?: string

  // Allow custom claims via custom access token hooks
  [key: string]: any
}

export type Uint8Array_ = ReturnType<Uint8Array['slice']>

export function decodeJWT(token: string): {
  header: JwtHeader
  payload: JwtPayload
  signature: Uint8Array_
  raw: {
    header: string
    payload: string
  }
} {
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw new AuthInvalidJwtError('Invalid JWT structure')
  }

  // Regex checks for base64url format
  for (let i = 0; i < parts.length; i++) {
    if (!BASE64URL_REGEX.test(parts[i] as string)) {
      throw new AuthInvalidJwtError('JWT not in base64url format')
    }
  }
  const data = {
    // using base64url lib
    header: JSON.parse(stringFromBase64URL(parts[0])),
    payload: JSON.parse(stringFromBase64URL(parts[1])),
    signature: base64UrlToUint8Array(parts[2]),
    raw: {
      header: parts[0],
      payload: parts[1]
    }
  }
  return data
}
