import { describe, expect, it } from 'vitest'
import { JUPITER_PROJECT_ID_HEADER } from '@jupiter-cloud/core'
import { JupiterAuth } from '../src'

describe('JupiterAuth', () => {
  it('signs up with camelCase SDK options mapped to API fields', async () => {
    const requests: CapturedRequest[] = []
    const auth = createAuth(requests, {
      access_token: 'access',
      expires_at: 1,
      expires_in: 3600,
      refresh_token: 'refresh',
      token_type: 'bearer'
    })

    await auth.signUp(
      {
        codeChallenge: 'challenge',
        codeChallengeMethod: 's256',
        email: 'user@example.com',
        password: 'password1'
      },
      {
        redirectTo: 'https://app.example.test/callback'
      }
    )

    expect(requests[0]?.url).toBe('https://auth.example.test/signup')
    expect(requests[0]?.method).toBe('POST')
    expect(requests[0]?.headers.get(JUPITER_PROJECT_ID_HEADER)).toBe('project-1')
    expect(requests[0]?.headers.get('redirect_to')).toBe('https://app.example.test/callback')
    expectJsonBody(requests[0]?.body, {
      code_challenge: 'challenge',
      code_challenge_method: 's256',
      email: 'user@example.com',
      password: 'password1'
    })
  })

  it('maps password sign-in to token password grant', async () => {
    const requests: CapturedRequest[] = []
    const auth = createAuth(requests, {
      access_token: 'access',
      expires_at: 1,
      expires_in: 3600,
      refresh_token: 'refresh',
      token_type: 'bearer'
    })

    await auth.signInWithPassword({
      email: 'user@example.com',
      password: 'password1'
    })

    expect(requests[0]?.url).toBe('https://auth.example.test/token?grant_type=password')
    expectJsonBody(requests[0]?.body, {
      email: 'user@example.com',
      password: 'password1'
    })
  })

  it('builds OAuth authorize URLs', () => {
    const auth = new JupiterAuth('https://auth.example.test', {
      projectId: 'project-1'
    })

    const url = new URL(
      auth.getAuthorizeUrl({
        codeChallenge: 'challenge',
        codeChallengeMethod: 's256',
        provider: 'github',
        redirectTo: 'https://app.example.test/callback',
        scopes: 'read:user'
      })
    )

    expect(url.origin).toBe('https://auth.example.test')
    expect(url.pathname).toBe('/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      code_challenge: 'challenge',
      code_challenge_method: 's256',
      project_id: 'project-1',
      provider: 'github',
      redirect_to: 'https://app.example.test/callback',
      scopes: 'read:user'
    })
  })

  it('sends authenticated role and claims headers for user operations', async () => {
    const requests: CapturedRequest[] = []
    const auth = createAuth(requests, {
      created_at: '2026-07-05T12:00:00.000Z',
      email_verified: true,
      id: 'user-1',
      is_anonymous: false,
      phone_verified: false,
      project_id: 'project-1',
      updated_at: '2026-07-05T12:00:00.000Z'
    })

    await auth.getUser({
      claims: {
        sub: 'user-1'
      }
    })

    expect(requests[0]?.headers.get('X-Jupiter-Role')).toBe('authenticated')
    expect(requests[0]?.headers.get('X-Jupiter-Claims')).toBe('{"sub":"user-1"}')
  })

  it('sends admin role headers for admin operations', async () => {
    const requests: CapturedRequest[] = []
    const auth = createAuth(requests, {
      users: []
    })

    await auth.adminListUsers({
      page: 2,
      perPage: 10,
      sort: 'created_at desc'
    })

    expect(requests[0]?.url).toBe(
      'https://auth.example.test/admin/users?page=2&per_page=10&sort=created_at+desc'
    )
    expect(requests[0]?.headers.get('X-Jupiter-Role')).toBe('admin')
  })

  it('posts OAuth form callbacks as form-url-encoded bodies', async () => {
    const requests: CapturedRequest[] = []
    const auth = createAuth(requests, new Blob())

    await auth.externalProviderCallbackPost({
      code: 'provider-code',
      state: 'state-1',
      user: '{"email":"user@example.com"}'
    })

    expect(requests[0]?.url).toBe('https://auth.example.test/callback')
    expect(requests[0]?.method).toBe('POST')
    expect(requests[0]?.headers.get('content-type')).toBe(
      'application/x-www-form-urlencoded;charset=UTF-8'
    )
    expect(requests[0]?.body).toBeInstanceOf(URLSearchParams)
    expect(Object.fromEntries(requests[0]?.body as URLSearchParams)).toEqual({
      code: 'provider-code',
      state: 'state-1',
      user: '{"email":"user@example.com"}'
    })
  })
})

type CapturedRequest = {
  body: BodyInit | null | undefined
  headers: Headers
  method: string | undefined
  url: string
}

function createAuth(requests: CapturedRequest[], responseBody: unknown): JupiterAuth {
  return new JupiterAuth('https://auth.example.test', {
    fetch: (input, init) => {
      requests.push({
        body: init?.body,
        headers: new Headers(init?.headers),
        method: init?.method,
        url: toRequestUrl(input)
      })

      return Promise.resolve(Response.json(responseBody))
    },
    projectId: 'project-1'
  })
}

function expectJsonBody(body: BodyInit | null | undefined, expected: unknown): void {
  expect(body).toBeTypeOf('string')
  expect(JSON.parse(body as string)).toEqual(expected)
}

function toRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}
