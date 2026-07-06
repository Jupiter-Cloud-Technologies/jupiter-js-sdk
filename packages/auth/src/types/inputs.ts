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
