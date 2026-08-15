import { JUPITER_PROJECT_ID_HEADER } from '@jupiter-cloud/core'
import { describe, expect, it } from 'vitest'
import { Jupiter } from '../src'

describe('Jupiter', () => {
  const projectId = '00000000-0000-4000-8000-000000000001'
  const adminToken = 'admin-token'

  it('creates service clients', () => {
    const client = new Jupiter('https://api.example.test', projectId, adminToken)

    expect(client.auth).toBeDefined()
    expect(client.storage).toBeDefined()
    // expect(client.db).toBeDefined()
  })

  it('creates service clients without an admin token', () => {
    const client = new Jupiter('https://api.example.test', projectId)

    expect(client.auth).toBeDefined()
    expect(client.storage).toBeDefined()
  })

  it('uses the configured base URL for service clients', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter('https://api.example.test/', projectId, adminToken, {
      global: {
        fetch: createFetch(requests)
      }
    })

    await client.storage.listBuckets()
    await client.auth.getUser('access-token')

    expect(requests.map((request) => request.url)).toEqual([
      'https://api.example.test/storage/buckets',
      'https://api.example.test/user'
    ])
  })

  it('uses the configured project ID for service clients', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter('https://api.example.test', projectId, adminToken, {
      global: {
        fetch: createFetch(requests)
      }
    })

    await client.storage.listBuckets()
    await client.auth.getUser('access-token')

    expect(requests.map((request) => request.headers.get(JUPITER_PROJECT_ID_HEADER))).toEqual([
      projectId,
      projectId
    ])
  })

  it('accepts options as the third argument when no admin token is provided', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter('https://api.example.test', projectId, {
      global: {
        fetch: createFetch(requests)
      }
    })

    await client.storage.listBuckets()

    expect(requests[0]?.headers.get('authorization')).toBeNull()
    expect(requests[0]?.headers.get(JUPITER_PROJECT_ID_HEADER)).toBe(projectId)
  })
})

type CapturedRequest = {
  headers: Headers
  url: string
}

function createFetch(requests: CapturedRequest[]): typeof fetch {
  return (input, init) => {
    requests.push({
      headers: new Headers(init?.headers),
      url: toRequestUrl(input)
    })

    return Promise.resolve(
      Response.json({
        buckets: [],
        count: 0
      })
    )
  }
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
