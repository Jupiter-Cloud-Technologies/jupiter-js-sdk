export type RetryOptions = {
  attempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryableStatuses?: readonly number[]
}

const defaultRetryableStatuses: readonly number[] = [408, 409, 425, 429, 500, 502, 503, 504]

export function shouldRetry(status: number, retryableStatuses = defaultRetryableStatuses): boolean {
  return retryableStatuses.includes(status)
}

export function getRetryDelayMs(attempt: number, options: RetryOptions = {}): number {
  const baseDelayMs = options.baseDelayMs ?? 100
  const maxDelayMs = options.maxDelayMs ?? 2_000
  const exponentialDelay = baseDelayMs * 2 ** Math.max(0, attempt - 1)
  return Math.min(exponentialDelay, maxDelayMs)
}
