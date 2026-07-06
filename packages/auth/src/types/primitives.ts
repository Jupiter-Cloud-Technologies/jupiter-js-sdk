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
