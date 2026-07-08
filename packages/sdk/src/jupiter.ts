import { JupiterStorage } from '@jupiter-cloud/storage'
import type { JupiterSDKOptions } from './types'
import type { Fetch } from '@jupiter-cloud/core'
import { applySettingDefaults, type ResolvedJupiterSDKOptions } from './helpers'
import type { JupiterAuthOptions } from '.'
import { fetchWithAuth } from './fetch'
import { JupiterAuth, type AuthChangeEvent } from '@jupiter-cloud/auth'
import { NeonPostgrestClient, type DefaultSchemaName } from '@jupiter-cloud/postgrest'
import { getDefaults } from './internal/defaults'
import { validateProjectId } from './internal/validation'

export class Jupiter<
  Database = any,
  SchemaName extends string & keyof Database = DefaultSchemaName<Database>
> {
  db: NeonPostgrestClient<Database, SchemaName>
  auth: JupiterAuth
  storage: JupiterStorage

  private baseUrl: string
  private baseUrlU: URL
  private projectId: string

  protected jauthUrl: URL
  protected jstorageUrl: URL
  protected jdbrestUrl: URL
  protected jdbrestUrlString: string

  protected storageKey: string
  protected fetch?: Fetch
  protected changedAccessToken?: string
  protected accessToken?: () => Promise<string | null>

  protected headers: Record<string, string>
  protected settings?: ResolvedJupiterSDKOptions<SchemaName>

  constructor(baseurl: string, projectId: string, options?: JupiterSDKOptions<SchemaName>) {
    this.baseUrl = normalizeBaseUrl(baseurl)
    validateProjectId(projectId)
    this.projectId = projectId
    this.baseUrlU = new URL(this.baseUrl)
    this.jauthUrl = new URL('auth', this.baseUrl)
    this.jstorageUrl = new URL('storage', this.baseUrl)
    this.jdbrestUrl = new URL('db/rest', this.baseUrl)
    this.jdbrestUrlString = this.jdbrestUrl.toString()

    this.projectId = projectId
    const defaults = getDefaults(this.baseUrlU, this.projectId)
    const settings = applySettingDefaults(options ?? {}, defaults)
    this.settings = settings

    this.storageKey = settings.auth.storageKey ?? ''
    this.headers = settings.global.headers ?? {}

    if (!settings.accessToken) {
      this.auth = this._initAuthClient(
        {
          ...(settings.auth ?? {}),
          projectId: projectId
        },
        this.headers,
        settings.global.fetch
      )
    } else {
      this.accessToken = settings.accessToken

      this.auth = new Proxy<JupiterAuth>({} as any, {
        get: (_, prop) => {
          throw new Error(`@.${String(prop)} is not possible`)
        }
      })
    }

    this.fetch = fetchWithAuth(
      this.projectId,
      this._getAccessToken.bind(this),
      settings.global.fetch
    )

    if (this.accessToken) {
      // Start auth immediately to avoid race condition with channel subscriptions
      // Wrap Promise to avoid Firefox extension cross-context Promise access errors
      Promise.resolve(this.accessToken()).catch((e) =>
        console.warn('Failed to set initial Realtime auth token:', e)
      )
    }

    this.db = this._initRestClient(this.jdbrestUrlString, this.headers, this.fetch)

    this.storage = this.createStorage()

    if (!settings.accessToken) {
      this._listenForAuthEvents()
    }
  }

  private async _getAccessToken() {
    if (this.accessToken) {
      return await this.accessToken()
    }

    const { data } = await this.auth.getSession()

    return data.session?.access_token ?? null
  }

  private _initRestClient(url: string, headers: Record<string, string>, fetch: Fetch) {
    const client = new NeonPostgrestClient<Database, SchemaName>({
      dataApiUrl: url,
      options: {
        global: {
          fetch: fetch,
          headers: headers
        }
      }
    })
    return client
  }

  private _initAuthClient(
    {
      autoRefreshToken,
      persistSession,
      detectSessionInUrl,
      storage,
      userStorage,
      storageKey,
      flowType,
      lock,
      debug,
      throwOnError,
      lockAcquireTimeout,
      skipAutoInitialize
    }: JupiterAuthOptions,
    headers?: Record<string, string>,
    fetch?: Fetch
  ) {
    const authHeaders = {
      project_id: this.projectId
    }

    return new JupiterAuth(this.baseUrl, {
      projectId: this.projectId,
      url: '',
      headers: { ...authHeaders, ...headers },
      storageKey: storageKey,
      autoRefreshToken,
      persistSession,
      detectSessionInUrl,
      storage,
      userStorage,
      flowType,
      lock,
      debug,
      throwOnError,
      fetch,
      lockAcquireTimeout,
      skipAutoInitialize,
      // auth checks if there is a custom authorizaiton header using this flag
      // so it knows whether to return an error when getUser is called with no session
      hasCustomAuthorizationHeader: Object.keys(this.headers).some(
        (key) => key.toLowerCase() === 'authorization'
      )
    })
  }

  private _listenForAuthEvents() {
    const data = this.auth.onAuthStateChange((event, session) => {
      this._handleTokenChanged(event, 'CLIENT', session?.access_token)
    })
    return data
  }

  private _handleTokenChanged(
    event: AuthChangeEvent,
    source: 'CLIENT' | 'STORAGE',
    token?: string
  ) {
    if (
      (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
      this.changedAccessToken !== token
    ) {
      this.changedAccessToken = token
      // this.realtime.setAuth(token)
    } else if (event === 'SIGNED_OUT') {
      // this.realtime.setAuth()
      if (source == 'STORAGE') this.auth.signOut()
      this.changedAccessToken = undefined
    }
  }

  private createStorage(): JupiterStorage {
    const urlString = this.jstorageUrl.toString()

    return new JupiterStorage(urlString, {
      fetch: this.fetch,
      headers: this.headers,
      projectId: this.projectId
    })
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}
