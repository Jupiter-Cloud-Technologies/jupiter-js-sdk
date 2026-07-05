import { describe, expect, it } from 'vitest'
import { JupiterError } from '../src/errors'
import { HttpClient } from '../src/http'

describe('HttpClient', () => {
  it('adds query parameters', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: (input) => {
        expect(toRequestUrl(input)).toBe('https://api.example.test/buckets?limit=10')
        return Promise.resolve(Response.json({ ok: true }))
      }
    })

    const result = await client.request<{ ok: boolean }>('/buckets', {
      query: { limit: 10 }
    })

    expect(result.data).toEqual({ ok: true })
  })

  it('preserves application/problem+json error codes', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              code: 'storage.bucket_not_found',
              detail: "Bucket 'avatars' does not exist.",
              status: 404,
              title: 'Bucket not found',
              type: 'about:blank'
            },
            {
              headers: {
                'content-type': 'application/problem+json',
                'x-request-id': 'req_123'
              },
              status: 404
            }
          )
        )
    })

    const result = await client.request('/buckets/avatars')

    expect(result.data).toBeNull()
    expect(result.response.status).toBe(404)
    expect(result.error).toEqual({
      code: 'storage.bucket_not_found',
      detail: "Bucket 'avatars' does not exist.",
      requestId: 'req_123',
      status: 404,
      title: 'Bucket not found',
      type: 'about:blank'
    })
  })

  it('normalizes auth API error responses', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              code: 'validation_failed',
              message: 'Email is required.',
              weak_password: {
                reasons: ['length']
              }
            },
            {
              headers: {
                'content-type': 'application/json',
                'x-request-id': 'req_auth'
              },
              status: 422,
              statusText: 'Unprocessable Entity'
            }
          )
        )
    })

    const result = await client.request('/signup')

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({
      code: 'validation_failed',
      detail: 'Email is required.',
      requestId: 'req_auth',
      status: 422,
      title: 'Unprocessable Entity',
      type: 'about:blank',
      weak_password: {
        reasons: ['length']
      }
    })
  })

  it('normalizes OAuth-style error responses', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              error: 'invalid_grant',
              error_description: 'Refresh token is invalid.'
            },
            {
              headers: {
                'content-type': 'application/json'
              },
              status: 400,
              statusText: 'Bad Request'
            }
          )
        )
    })

    const result = await client.request('/token')

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({
      code: 'invalid_grant',
      detail: 'Refresh token is invalid.',
      error: 'invalid_grant',
      error_description: 'Refresh token is invalid.',
      status: 400,
      title: 'Bad Request',
      type: 'about:blank'
    })
  })

  it('returns network failures as typed error results', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: () => Promise.reject(new TypeError('fetch failed'))
    })

    const result = await client.request('/buckets')

    expect(result.data).toBeNull()
    expect(result.response.status).toBe(503)
    expect(result.error).toMatchObject({
      code: 'jupiter.network_error',
      detail: 'fetch failed',
      status: 503,
      title: 'Network request failed',
      type: 'about:blank'
    })
  })

  it('returns timeout failures as typed error results', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal

          expect(signal).toBeInstanceOf(AbortSignal)

          signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'))
            },
            {
              once: true
            }
          )
        }),
      timeoutMs: 1
    })

    const result = await client.request('/slow')

    expect(result.data).toBeNull()
    expect(result.response.status).toBe(408)
    expect(result.error).toMatchObject({
      code: 'jupiter.timeout_error',
      detail: 'Request timed out after 1 milliseconds.',
      status: 408,
      title: 'Request timed out',
      type: 'about:blank'
    })
  })

  it('returns invalid successful response bodies as typed error results', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: () =>
        Promise.resolve(
          new Response('{', {
            headers: {
              'content-type': 'application/json'
            },
            status: 200
          })
        )
    })

    const result = await client.request('/buckets')

    expect(result.data).toBeNull()
    expect(result.response.status).toBe(200)
    expect(result.error).toMatchObject({
      code: 'jupiter.invalid_response',
      status: 200,
      title: 'Invalid response',
      type: 'about:blank'
    })
  })

  it('throws typed JupiterError from requestOrThrow', async () => {
    const client = new HttpClient('https://api.example.test', {
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              code: 'storage.object_not_found',
              detail: "Object 'missing.png' does not exist.",
              status: 404,
              title: 'Object not found',
              type: 'about:blank'
            },
            {
              headers: {
                'content-type': 'application/problem+json'
              },
              status: 404
            }
          )
        )
    })

    await expect(client.requestOrThrow('/objects/missing.png')).rejects.toMatchObject({
      code: 'storage.object_not_found',
      detail: "Object 'missing.png' does not exist.",
      name: 'JupiterError',
      status: 404
    })

    await expect(client.requestOrThrow('/objects/missing.png')).rejects.toBeInstanceOf(JupiterError)
  })
})

function toRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}
