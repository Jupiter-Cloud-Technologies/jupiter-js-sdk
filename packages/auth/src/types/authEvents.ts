export type AuthChangeEventMFA = 'MFA_CHALLENGE_VERIFIED'

export type AuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'PASSWORD_RECOVERY'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | AuthChangeEventMFA
