import { describe, expect, it } from 'vitest'
import { Jupiter } from '../src/Jupiter'

describe('Jupiter', () => {
  it('creates a storage client', () => {
    const client = Jupiter('https://api.example.test', {
      projectId: 'project-1'
    })

    expect(client.storage).toBeDefined()
  })

  it('updates service clients when base URL changes', async () => {
    const requests: CapturedRequest[] = []
    const client = Jupiter('https://api-one.example.test/', {
      fetch: createFetch(requests),
      projectId: 'project-1'
    })

    await client.storage.listBuckets()
    client.setBaseUrl('https://api-two.example.test/')
    await client.storage.listBuckets()

    expect(requests.map((request) => request.url)).toEqual([
      'https://api-one.example.test/storage/buckets',
      'https://api-two.example.test/storage/buckets'
    ])
  })

  it('updates service clients when project ID changes', async () => {
    const requests: CapturedRequest[] = []
    const client = Jupiter('https://api.example.test', {
      fetch: createFetch(requests),
      projectId: 'project-1'
    })

    await client.storage.listBuckets()
    client.setProjectId('project-2')
    await client.storage.listBuckets()

    expect(requests.map((request) => request.headers.get('X-Jupiter-Project-Id'))).toEqual([
      'project-1',
      'project-2'
    ])
  })

  it('returns itself from setters for chaining', () => {
    const client = Jupiter('https://api.example.test', {
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
