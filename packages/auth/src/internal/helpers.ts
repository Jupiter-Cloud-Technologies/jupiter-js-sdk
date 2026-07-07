import type { PublicUser } from '../types'
import type { Fetch } from '../types/fetch'
import type { SupportedStorage } from '../types/storage'
import { isAuthError, type AuthImplicitGrantRedirectError } from './errors'

export const resolveFetch = (customFetch?: Fetch): Fetch => {
  if (customFetch) {
    return (...args) => customFetch(...args)
  }
  return (...args) => fetch(...args)
}

/**
 * Extracts parameters encoded in the URL both in the query and fragment.
 */
export function parseParametersFromURL(href: string) {
  const result: { [parameter: string]: string } = {}

  const url = new URL(href)

  if (url.hash && url.hash[0] === '#') {
    try {
      const hashSearchParams = new URLSearchParams(url.hash.substring(1))
      hashSearchParams.forEach((value, key) => {
        result[key] = value
      })
    } catch (_e) {
      // hash is not a query string
    }
  }

  // search parameters take precedence over hash parameters
  url.searchParams.forEach((value, key) => {
    result[key] = value
  })

  return result
}

export function isAuthImplicitGrantRedirectError(
  error: any
): error is AuthImplicitGrantRedirectError {
  return isAuthError(error) && error.name === 'AuthImplicitGrantRedirectError'
}

export const looksLikeFetchResponse = (maybeResponse: unknown): maybeResponse is Response => {
  return (
    typeof maybeResponse === 'object' &&
    maybeResponse !== null &&
    'status' in maybeResponse &&
    'ok' in maybeResponse &&
    'json' in maybeResponse &&
    typeof (maybeResponse as any).json === 'function'
  )
}

// Storage helpers
export const setItemAsync = async (
  storage: SupportedStorage,
  key: string,
  data: any
): Promise<void> => {
  await storage.setItem(key, JSON.stringify(data))
}

export const getItemAsync = async (storage: SupportedStorage, key: string): Promise<unknown> => {
  const value = await storage.getItem(key)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    // Storage values are always written as JSON via setItemAsync. A non-JSON
    // value means the entry is corrupted (e.g. mismatched chunked cookies in
    // SSR contexts). Treat as absent so callers do not mutate or re-save the
    // garbage, which would otherwise trigger a TypeError downstream and
    // leak the raw value into error logs.
    return null
  }
}

export const removeItemAsync = async (storage: SupportedStorage, key: string): Promise<void> => {
  await storage.removeItem(key)
}

/**
 * Deep clones a JSON-serializable object using JSON.parse(JSON.stringify(obj)).
 * Note: Only works for JSON-safe data.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export async function getCodeChallengeAndMethod(
  storage: SupportedStorage,
  storageKey: string,
  isPasswordRecovery = false
) {
  const codeVerifier = generatePKCEVerifier()
  let storedCodeVerifier = codeVerifier
  if (isPasswordRecovery) {
    storedCodeVerifier += '/recovery'
  }
  await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier)
  const codeChallenge = await generatePKCEChallenge(codeVerifier)
  const codeChallengeMethod = codeVerifier === codeChallenge ? 'plain' : 's256'
  return [codeChallenge, codeChallengeMethod]
}

// Functions below taken from: https://stackoverflow.com/questions/63309409/creating-a-code-verifier-and-challenge-for-pkce-auth-on-spotify-api-in-reactjs
export function generatePKCEVerifier() {
  const verifierLength = 56
  const array = new Uint32Array(verifierLength)
  if (typeof crypto === 'undefined') {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    const charSetLen = charSet.length
    let verifier = ''
    for (let i = 0; i < verifierLength; i++) {
      verifier += charSet.charAt(Math.floor(Math.random() * charSetLen))
    }
    return verifier
  }
  crypto.getRandomValues(array)
  return Array.from(array, dec2hex).join('')
}

function dec2hex(dec: number) {
  return ('0' + dec.toString(16)).substr(-2)
}

export async function generatePKCEChallenge(verifier: string) {
  const hasCryptoSupport =
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof TextEncoder !== 'undefined'

  if (!hasCryptoSupport) {
    console.warn(
      'WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.'
    )
    return verifier
  }
  const hashed = await sha256(verifier)
  return btoa(hashed).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(randomString: string) {
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(randomString)
  const hash = await crypto.subtle.digest('SHA-256', encodedData)
  const bytes = new Uint8Array(hash)

  return Array.from(bytes)
    .map((c) => String.fromCharCode(c))
    .join('')
}

export const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

export function userNotAvailableProxy(): PublicUser {
  const proxyTarget = {} as PublicUser

  return new Proxy(proxyTarget, {
    get: (_target: any, prop: string) => {
      if (prop === '__isUserNotAvailableProxy') {
        return true
      }
      // Preventative check for common problematic symbols during cloning/inspection
      // These symbols might be accessed by structuredClone or other internal mechanisms.
      if (typeof prop === 'symbol') {
        const sProp = (prop as symbol).toString()
        if (
          sProp === 'Symbol(Symbol.toPrimitive)' ||
          sProp === 'Symbol(Symbol.toStringTag)' ||
          sProp === 'Symbol(util.inspect.custom)'
        ) {
          // Node.js util.inspect
          return undefined
        }
      }
      throw new Error(
        `@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${prop}" property of the session object is not supported. Please use getUser() instead.`
      )
    },
    set: (_target: any, prop: string) => {
      throw new Error(
        `@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`
      )
    },
    deleteProperty: (_target: any, prop: string) => {
      throw new Error(
        `@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`
      )
    }
  })
}

export function insecureUserWarningProxy(
  user: PublicUser,
  suppressWarningRef: { value: boolean }
): PublicUser {
  return new Proxy(user, {
    get: (target: any, prop: string | symbol, receiver: any) => {
      // Allow internal checks without warning
      if (prop === '__isInsecureUserWarningProxy') {
        return true
      }

      // Preventative check for common problematic symbols during cloning/inspection
      // These symbols might be accessed by structuredClone or other internal mechanisms
      if (typeof prop === 'symbol') {
        const sProp = prop.toString()
        if (
          sProp === 'Symbol(Symbol.toPrimitive)' ||
          sProp === 'Symbol(Symbol.toStringTag)' ||
          sProp === 'Symbol(util.inspect.custom)' ||
          sProp === 'Symbol(nodejs.util.inspect.custom)'
        ) {
          // Return the actual value for these symbols to allow proper inspection
          return Reflect.get(target, prop, receiver)
        }
      }

      // Emit warning on first property access
      if (!suppressWarningRef.value && typeof prop === 'string') {
        console.warn(
          'Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.'
        )
        suppressWarningRef.value = true
      }

      return Reflect.get(target, prop, receiver)
    }
  })
}

/**
 * A deferred represents some asynchronous work that is not yet finished, which
 * may or may not culminate in a value.
 * Taken from: https://github.com/mike-north/types/blob/master/src/async.ts
 */
export class Deferred<T = any> {
  public static promiseConstructor: PromiseConstructor = Promise

  public readonly promise!: PromiseLike<T>

  public readonly resolve!: (value?: T | PromiseLike<T>) => void

  public readonly reject!: (reason?: any) => any

  public constructor() {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(this as any).promise = new Deferred.promiseConstructor((res, rej) => {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;(this as any).resolve = res
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;(this as any).reject = rej
    })
  }
}

/**
 * Converts the provided async function into a retryable function. Each result
 * or thrown error is sent to the isRetryable function which should return true
 * if the function should run again.
 */
export function retryable<T>(
  fn: (attempt: number) => Promise<T>,
  isRetryable: (attempt: number, error: any | null, result?: T) => boolean
): Promise<T> {
  const promise = new Promise<T>((accept, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      for (let attempt = 0; attempt < Infinity; attempt++) {
        try {
          const result = await fn(attempt)

          if (!isRetryable(attempt, null, result)) {
            accept(result)
            return
          }
        } catch (e) {
          if (!isRetryable(attempt, e)) {
            reject(e)
            return
          }
        }
      }
    })()
  })

  return promise
}

/**
 * Creates a promise that resolves to null after some time.
 */
export async function sleep(time: number): Promise<null> {
  return await new Promise((accept) => {
    setTimeout(() => accept(null), time)
  })
}

/**
 * Generates a unique identifier for internal callback subscriptions.
 *
 * This function uses JavaScript Symbols to create guaranteed-unique identifiers
 * for auth state change callbacks. Symbols are ideal for this use case because:
 * - They are guaranteed unique by the JavaScript runtime
 * - They work in all environments (browser, SSR, Node.js)
 * - They avoid issues with Next.js 16 deterministic rendering requirements
 * - They are perfect for internal, non-serializable identifiers
 *
 * Note: This function is only used for internal subscription management,
 * not for security-critical operations like session tokens.
 */
export function generateCallbackId(): symbol {
  return Symbol('auth-callback')
}

export function validateExp(exp: number) {
  if (!exp) {
    throw new Error('Missing exp claim')
  }
  const timeNow = Math.floor(Date.now() / 1000)
  if (exp <= timeNow) {
    throw new Error('JWT has expired')
  }
}

export function getAlgorithm(
  alg: 'HS256' | 'RS256' | 'ES256' | 'EdDSA' | (string & {})
): RsaHashedImportParams | EcKeyImportParams | AlgorithmIdentifier {
  switch (alg) {
    case 'RS256':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      }
    case 'ES256':
      return {
        name: 'ECDSA',
        namedCurve: 'P-256',
        hash: { name: 'SHA-256' }
      }
    case 'EdDSA':
      return {
        name: 'Ed25519'
      }
    default:
      throw new Error('Invalid alg claim')
  }
}

const localStorageWriteTests = {
  tested: false,
  writable: false
}

/**
 * Checks whether localStorage is supported on this browser.
 */
export const supportsLocalStorage = () => {
  if (!isBrowser()) {
    return false
  }

  try {
    if (typeof globalThis.localStorage !== 'object') {
      return false
    }
  } catch (e) {
    // DOM exception when accessing `localStorage`
    return false
  }

  if (localStorageWriteTests.tested) {
    return localStorageWriteTests.writable
  }

  const randomKey = `lswt-${Math.random()}${Math.random()}`

  try {
    globalThis.localStorage.setItem(randomKey, randomKey)
    globalThis.localStorage.removeItem(randomKey)

    localStorageWriteTests.tested = true
    localStorageWriteTests.writable = true
  } catch (e) {
    // localStorage can't be written to
    // https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document

    localStorageWriteTests.tested = true
    localStorageWriteTests.writable = false
  }

  return localStorageWriteTests.writable
}
