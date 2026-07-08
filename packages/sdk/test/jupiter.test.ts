import { describe, expect, it } from 'vitest'
import { JUPITER_PROJECT_ID_HEADER } from '@jupiter-cloud/core'
import { Jupiter } from '../src'

describe('Jupiter', () => {
  it('creates a storage client', () => {
    const client = new Jupiter('https://api.example.test', 'project-1')

    expect(client.auth).toBeDefined()
    expect(client.storage).toBeDefined()
  })

  it('uses the configured base URL for service clients', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter('https://api.example.test/', 'project-1', {
      global: {
        fetch: createFetch(requests)
      }
    })

    await client.storage.listBuckets()
    await client.auth.getUser('access-token')

    expect(requests.map((request) => request.url)).toEqual([
      'https://api.example.test/storage/buckets',
      'https://api.example.test/auth/user'
    ])
  })

  it('uses the configured project ID for service clients', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter('https://api.example.test', 'project-1', {
      global: {
        fetch: createFetch(requests)
      }
    })

    await client.storage.listBuckets()
    await client.auth.getUser('access-token')

    expect(requests.map((request) => request.headers.get(JUPITER_PROJECT_ID_HEADER))).toEqual([
      'project-1',
      'project-1'
    ])
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
