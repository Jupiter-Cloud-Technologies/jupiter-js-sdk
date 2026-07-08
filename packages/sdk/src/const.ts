import type { JauthClientOptions } from './types'

/*let JS_ENV = ''
let JS_RUNTIME_VERSION: string | undefined
// @ts-ignore
if (typeof Deno !== 'undefined') {
  JS_ENV = 'deno'
  // @ts-ignore
  JS_RUNTIME_VERSION = Deno.version?.deno
} else if (typeof document !== 'undefined') {
  JS_ENV = 'web'
} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  JS_ENV = 'react-native'
} else {
  JS_ENV = 'node'
  JS_RUNTIME_VERSION =
    typeof process !== 'undefined' ? process.version?.replace(/^v/, '') : undefined
}*/

/*const _runtimeMeta = [`runtime=${JS_ENV}`]
if (JS_RUNTIME_VERSION) {
  _runtimeMeta.push(`runtime-version=${JS_RUNTIME_VERSION}`)
}*/

export const DEFAULT_DB_OPTIONS = {
  schema: 'public'
}

export const DEFAULT_AUTH_OPTIONS: JauthClientOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
  projectId: ''
}
