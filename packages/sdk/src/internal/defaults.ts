import { JUPITER_PROJECT_ID_HEADER } from '@jupiter-cloud/core'
import type { JauthClientOptions } from '../types'

export function getDefaultStorageKey(baseurl: URL) {
  const defaultStorageKey = `J-${baseurl.hostname.split('.')[0]}-auth-token`
  return defaultStorageKey
}

export const DEFAULT_HEADERS = {
  // 'X-Client-Info': `; ${_runtimeMeta.join('; ')}`,
  [JUPITER_PROJECT_ID_HEADER]: ''
}

export const DEFAULT_GLOBAL_OPTIONS = {
  headers: DEFAULT_HEADERS
}

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

export function getDefaults(url: URL, projectId: string) {
  const storageKey = getDefaultStorageKey(url)
  const DEFAULTS = {
    db: DEFAULT_DB_OPTIONS,
    auth: { ...DEFAULT_AUTH_OPTIONS, storageKey: storageKey },
    global: {
      ...DEFAULT_GLOBAL_OPTIONS,
      headers: {
        ...DEFAULT_HEADERS,
        [JUPITER_PROJECT_ID_HEADER]: projectId
      }
    }
  }
  return DEFAULTS
}
