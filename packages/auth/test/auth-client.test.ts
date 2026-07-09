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

    await auth.signUpWithEmailAndPassword({
      email: 'user@example.com',
      password: 'password1',
      options: {
        emailRedirectTo: 'https://app.example.test/callback'
      }
    })

    expect(requests[0]?.url).toBe(
      'https://auth.example.test/signup?redirect_to=https%3A%2F%2Fapp.example.test%2Fcallback'
    )
    expect(requests[0]?.method).toBe('POST')
    expect(requests[0]?.headers.get(JUPITER_PROJECT_ID_HEADER)).toBe('project-1')
    expectJsonBody(requests[0]?.body, {
      attributes: {},
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

    await auth.signInWithEmailAndPassword({
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

  it('sends auth headers for user operations', async () => {
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

    await auth.getUser('access-token')

    expect(requests[0]?.headers.get(JUPITER_PROJECT_ID_HEADER)).toBe('project-1')
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer access-token')
  })

  it('sends auth headers for admin operations', async () => {
    const requests: CapturedRequest[] = []
    const auth = createAuth(requests, {
      users: []
    })

    await auth.adminSignOut('access-token', 'global')

    expect(requests[0]?.url).toBe('https://auth.example.test/logout?scope=global')
    expect(requests[0]?.headers.get(JUPITER_PROJECT_ID_HEADER)).toBe('project-1')
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer access-token')
  })

  it('adds project ID to social provider authorize URLs', async () => {
    const auth = new JupiterAuth('https://auth.example.test', {
      projectId: 'project-1'
    })

    const {
      data: { url }
    } = await auth.signInWithSocial({
      provider: 'github',
      options: {
        skipBrowserRedirect: true
      }
    })

    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      project_id: 'project-1',
      provider: 'github'
    })
  })

  it('builds OAuth callback URLs', () => {
    const auth = new JupiterAuth('https://auth.example.test', {
      projectId: 'project-1'
    })

    const url = new URL(
      auth.getExternalProviderCallbackUrl({
        code: 'provider-code',
        state: 'state-1'
      })
    )

    expect(url.origin).toBe('https://auth.example.test')
    expect(url.pathname).toBe('/callback')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      code: 'provider-code',
      project_id: 'project-1',
      state: 'state-1'
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
