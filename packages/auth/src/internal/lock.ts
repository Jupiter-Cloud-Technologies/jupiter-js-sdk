/**
 * An error thrown when a lock cannot be acquired after some amount of time.
 *
 * @deprecated The auth client doesn't acquire locks around auth operations,
 * so this error never originates from `jupiter.auth.*` calls. Direct callers
 * of `navigatorLock` / `processLock` still receive it on acquire timeout.
 */
export abstract class LockAcquireTimeoutError extends Error {
  public readonly isAcquireTimeout = true

  constructor(message: string) {
    super(message)
  }
}
