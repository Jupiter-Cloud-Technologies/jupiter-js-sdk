import type { JupiterSDKOptions } from './types'

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : url + '/'
}

export const isBrowser = () => typeof window !== 'undefined'

export type ResolvedJupiterSDKOptions<SchemaName> = Omit<
  Required<JupiterSDKOptions<SchemaName>>,
  'tracePropagation'
> & {}

export function applySettingDefaults<
  Database = any,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(
  options: JupiterSDKOptions<SchemaName>,
  defaults: JupiterSDKOptions<any>
): ResolvedJupiterSDKOptions<SchemaName> {
  const { db: dbOptions, auth: authOptions, global: globalOptions } = options
  const {
    db: DEFAULT_DB_OPTIONS,
    auth: DEFAULT_AUTH_OPTIONS,
    global: DEFAULT_GLOBAL_OPTIONS
  } = defaults

  const result: ResolvedJupiterSDKOptions<SchemaName> = {
    db: {
      ...DEFAULT_DB_OPTIONS,
      ...dbOptions
    },
    auth: {
      ...DEFAULT_AUTH_OPTIONS,
      ...authOptions
    },
    // storage: {},
    global: {
      ...DEFAULT_GLOBAL_OPTIONS,
      ...globalOptions,
      headers: {
        ...(DEFAULT_GLOBAL_OPTIONS?.headers ?? {}),
        ...(globalOptions?.headers ?? {})
      }
    },
    accessToken: async () => ''
  }

  if (options.accessToken) {
    result.accessToken = options.accessToken
  } else {
    // hack around Required<>
    delete (result as any).accessToken
  }

  return result
}
