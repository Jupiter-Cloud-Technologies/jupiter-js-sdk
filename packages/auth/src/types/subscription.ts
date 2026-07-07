import type { AuthChangeEvent } from './authEvents'
import type { AccessTokenResponse } from './outputs'

export interface Subscription {
  /**
   * A unique identifier for this subscription, set by the client.
   * This is an internal identifier used for managing callbacks and should not be
   * relied upon by application code. Use the unsubscribe() method to remove listeners.
   */
  id: string | symbol
  /**
   * The function to call every time there is an event. eg: (eventName) => {}
   */
  callback: (event: AuthChangeEvent, session: AccessTokenResponse | null) => void
  /**
   * Call this to remove the listener.
   */
  unsubscribe: () => void
}
