import type { JsonObject } from '@jupiter-cloud/core'
import type {
  FactorId,
  FactorStatus,
  FactorType,
  IdentityId,
  IsoTimestamp,
  ProjectId,
  UserId
} from './primitives'

/** Password policy feedback returned by Auth. */
export type WeakPassword = {
  /** Human-readable password policy message. */
  message?: string

  /** Machine-readable password weakness reasons. */
  reasons?: ('length' | 'characters' | 'pwned')[]
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

/** TOTP factor details returned during enrollment. */
export type TotpObject = {
  /** SVG QR code. */
  qr_code?: string

  /** Shared TOTP secret. */
  secret?: string

  /** OTP auth URI. */
  uri?: string
}

/** WebAuthn request or response payload. */
export type WebAuthnParams = {
  rpId?: string | undefined
  rpOrigins?: string[] | undefined
  type?: 'create' | 'request' | undefined
  credential_response?: JsonObject | undefined
}

/** WebAuthn challenge details returned by Auth. */
export type WebAuthnChallengeData = {
  type?: 'create' | 'request'
  credential_options?: JsonObject
}
