export const SIGN_OUT_SCOPES = ['global', 'local', 'others'] as const
export type SignOutScope = (typeof SIGN_OUT_SCOPES)[number]
