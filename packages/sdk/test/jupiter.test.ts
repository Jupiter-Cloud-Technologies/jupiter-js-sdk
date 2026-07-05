import { describe, expect, it } from 'vitest'
import { JUPITER_PROJECT_ID_HEADER } from '@jupiter-cloud/core'
import { Jupiter } from '../src'

describe('Jupiter', () => {
  it('creates a storage client', () => {
    const client = new Jupiter({
      baseUrl: 'https://api.example.test',
      projectId: 'project-1'
    })

    expect(client.auth).toBeDefined()
    expect(client.storage).toBeDefined()
  })

  it('updates service clients when base URL changes', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter({
      baseUrl: 'https://api-one.example.test/',
      fetch: createFetch(requests),
      projectId: 'project-1'
    })

    await client.storage.listBuckets()
    await client.auth.healthCheck()
    client.setBaseUrl('https://api-two.example.test/')
    await client.storage.listBuckets()
    await client.auth.healthCheck()

    expect(requests.map((request) => request.url)).toEqual([
      'https://api-one.example.test/storage/buckets',
      'https://api-one.example.test/auth/health',
      'https://api-two.example.test/storage/buckets',
      'https://api-two.example.test/auth/health'
    ])
  })

  it('updates service clients when project ID changes', async () => {
    const requests: CapturedRequest[] = []
    const client = new Jupiter({
      baseUrl: 'https://api.example.test',
      fetch: createFetch(requests),
      projectId: 'project-1'
    })

    await client.storage.listBuckets()
    await client.auth.healthCheck()
    client.setProjectId('project-2')
    await client.storage.listBuckets()
    await client.auth.healthCheck()

    expect(requests.map((request) => request.headers.get(JUPITER_PROJECT_ID_HEADER))).toEqual([
      'project-1',
      'project-1',
      'project-2',
      'project-2'
    ])
  })

  it('returns itself from setters for chaining', () => {
    const client = new Jupiter({
      baseUrl: 'https://api.example.test',
      projectId: 'project-1'
    })

    expect(client.setBaseUrl('https://api-two.example.test')).toBe(client)
    expect(client.setProjectId('project-2')).toBe(client)
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
