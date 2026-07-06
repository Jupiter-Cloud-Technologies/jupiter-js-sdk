import type { JupiterErrorPayload, JupiterResult } from '@jupiter-cloud/core'
import type { WeakPassword } from './models'

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
