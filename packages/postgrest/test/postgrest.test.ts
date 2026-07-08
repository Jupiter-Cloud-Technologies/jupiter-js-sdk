import { describe, expect, it } from 'vitest'

import { NeonPostgrestClient } from '../src'

type TestDatabase = {
  public: {
    Tables: {
      todos: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

describe('NeonPostgrestClient', () => {
  it('uses configured fetch and headers', async () => {
    const requests: Array<{ input: URL | RequestInfo; init?: RequestInit }> = []
    const fetchMock: typeof fetch = (input, init) => {
      requests.push({ input, init })

      return Promise.resolve(
        new Response(JSON.stringify([{ id: 1, name: 'ship' }]), {
          headers: { 'content-type': 'application/json' },
          status: 200
        })
      )
    }

    const client = new NeonPostgrestClient<TestDatabase>({
      dataApiUrl: 'https://api.example.test/rest/v1',
      options: {
        global: {
          fetch: fetchMock,
          headers: { authorization: 'Bearer token' }
        },
        db: { schema: 'public' }
      }
    })

    const { data, error } = await client.from('todos').select()

    expect(error).toBeNull()
    expect(data).toEqual([{ id: 1, name: 'ship' }])
    expect(requests).toHaveLength(1)

    const request = requests[0]
    expect(request).toBeDefined()
    if (!request) {
      throw new Error('Expected PostgREST to make one request')
    }

    const requestUrl =
      typeof request.input === 'string'
        ? request.input
        : request.input instanceof URL
          ? request.input.toString()
          : request.input.url

    expect(requestUrl).toContain('/todos')
    expect(new Headers(request.init?.headers).get('authorization')).toBe('Bearer token')
  })
})
