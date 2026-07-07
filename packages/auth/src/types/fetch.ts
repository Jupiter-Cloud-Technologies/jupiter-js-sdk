import type { PublicUser } from './models'
import type { UserResponse } from './outputs'

export type Fetch = typeof fetch

/** Raw user data — either `{ user: User }` or the User object itself. */
interface JupiterUserData {
  user?: PublicUser
  [key: string]: any // data may BE the User directly (fallback path)
}

export function _userResponse(data: JupiterUserData): UserResponse {
  const user: PublicUser = data.user ?? (data as PublicUser)
  return { data: { user }, error: null }
}
