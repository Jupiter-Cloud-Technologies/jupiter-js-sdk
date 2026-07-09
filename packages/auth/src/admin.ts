import { resolveFetch, type Fetch } from '@jupiter-cloud/core'
import { isAuthError, type AuthError } from './internal/errors'
import type {
  AuthMFAAdminDeleteFactorParams,
  AuthMFAAdminDeleteFactorResponse,
  AuthMFAAdminListFactorsParams,
  AuthMFAAdminListFactorsResponse,
  JupiterAuthAdminMFAApi,
  PageParams,
  Pagination
} from './types/mfa'
import { SIGN_OUT_SCOPES, type SignOutScope } from './types/scopes'
import { _noResolveJsonResponse, _request } from './internal/fetch'
import type { AdminUserAttributesParams, PublicUser, UserResponse } from './types'
import { _userResponse } from './types/fetch'
import { validateUUID } from './internal/validation'

export default class JupiterAuthAdmin {
  mfa: JupiterAuthAdminMFAApi

  protected url: string
  protected headers: {
    [key: string]: string
  }
  protected fetch: Fetch
  constructor({
    url = '',
    headers = {},
    fetch
  }: {
    url: string
    headers?: {
      [key: string]: string
    }
    fetch?: Fetch
  }) {
    this.url = url
    this.headers = headers
    this.fetch = resolveFetch(fetch)
    this.mfa = {
      listFactors: this._listFactors.bind(this),
      deleteFactor: this._deleteFactor.bind(this)
    }
  }
  async signOut(
    jwt: string,
    target: SignOutScope = SIGN_OUT_SCOPES[0]
  ): Promise<{ data: null; error: AuthError | null }> {
    if (SIGN_OUT_SCOPES.indexOf(target) < 0) {
      throw new Error(
        `@jupiter-cloud/auth: Parameter scope must be one of ${SIGN_OUT_SCOPES.join(', ')}`
      )
    }

    try {
      await _request(this.fetch, 'POST', `${this.url}/logout?scope=${target}`, {
        headers: this.headers,
        jwt,
        noResolveJson: true
      })
      return { data: null, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }
  async invitNewUser(
    email: string,
    attributes?: object,
    options: {
      redirectTo?: string
    } = {}
  ): Promise<UserResponse> {
    try {
      return await _request(this.fetch, 'POST', `${this.url}/admin/invite`, {
        body: { email, attributes: attributes },
        headers: this.headers,
        redirectTo: options.redirectTo,
        xform: _userResponse
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }
  async createUser(attributes: AdminUserAttributesParams): Promise<UserResponse> {
    try {
      return await _request(this.fetch, 'POST', `${this.url}/admin/users`, {
        body: attributes,
        headers: this.headers,
        xform: _userResponse
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }
  async listUsers(
    params?: PageParams
  ): Promise<
    | { data: { users: PublicUser[]; aud: string } & Pagination; error: null }
    | { data: { users: [] }; error: AuthError }
  > {
    try {
      const pagination: Pagination = { nextPage: null, lastPage: 0, total: 0 }
      const response = await _request(this.fetch, 'GET', `${this.url}/admin/users`, {
        headers: this.headers,
        noResolveJson: true,
        query: {
          page: params?.page?.toString() ?? '',
          per_page: params?.perPage?.toString() ?? ''
        },
        xform: _noResolveJsonResponse
      })
      if (response.error) throw response.error

      const users = await response.json()
      const total = response.headers.get('x-total-count') ?? 0
      const links = response.headers.get('link')?.split(',') ?? []
      if (links.length > 0) {
        links.forEach((link: string) => {
          const page = parseInt(link.split(';')[0].split('=')[1].substring(0, 1))
          const rel = JSON.parse(link.split(';')[1].split('=')[1])
          pagination[`${rel}Page`] = page
        })

        pagination.total = parseInt(total)
      }
      return { data: { ...users, ...pagination }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { users: [] }, error }
      }
      throw error
    }
  }
  async getUserById(uid: string): Promise<UserResponse> {
    validateUUID(uid)

    try {
      return await _request(this.fetch, 'GET', `${this.url}/admin/users/${uid}`, {
        headers: this.headers,
        xform: _userResponse
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }
  async updateUserById(uid: string, attributes: AdminUserAttributesParams): Promise<UserResponse> {
    validateUUID(uid)

    try {
      return await _request(this.fetch, 'PUT', `${this.url}/admin/users/${uid}`, {
        body: attributes,
        headers: this.headers,
        xform: _userResponse
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }
  async deleteUser(id: string, shouldSoftDelete = false): Promise<UserResponse> {
    validateUUID(id)

    try {
      return await _request(this.fetch, 'DELETE', `${this.url}/admin/users/${id}`, {
        headers: this.headers,
        body: {
          should_soft_delete: shouldSoftDelete
        },
        xform: _userResponse
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }

  private async _listFactors(
    params: AuthMFAAdminListFactorsParams
  ): Promise<AuthMFAAdminListFactorsResponse> {
    validateUUID(params.userId)

    try {
      const { data, error } = await _request(
        this.fetch,
        'GET',
        `${this.url}/admin/users/${params.userId}/factors`,
        {
          headers: this.headers,
          xform: (factors: any) => {
            return { data: { factors }, error: null }
          }
        }
      )
      return { data, error }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  private async _deleteFactor(
    params: AuthMFAAdminDeleteFactorParams
  ): Promise<AuthMFAAdminDeleteFactorResponse> {
    validateUUID(params.userId)
    validateUUID(params.id)

    try {
      const data = await _request(
        this.fetch,
        'DELETE',
        `${this.url}/admin/users/${params.userId}/factors/${params.id}`,
        {
          headers: this.headers
        }
      )

      return { data, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }
}
