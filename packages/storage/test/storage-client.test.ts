import { describe, expect, it } from 'vitest'
import { JupiterStorage } from '../src'

describe('JupiterStorage', () => {
  it('creates a bucket with camelCase SDK options mapped to API fields', async () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      buckets: [],
      count: 0
    })

    await storage.createBucket({
      allowOverwrite: true,
      allowedMimeTypes: ['image/png'],
      fileSizeLimit: 1024,
      location: 'weur',
      name: 'avatars',
      public: false,
      signedUrlExpirySeconds: 600
    })

    expect(requests[0]?.url).toBe('https://storage.example.test/buckets')
    expect(requests[0]?.init.method).toBe('POST')
    expectJsonBody(requests[0]?.init.body, {
      allow_overwrite: true,
      allowed_mime_types: ['image/png'],
      file_size_limit: 1024,
      location: 'weur',
      name: 'avatars',
      public: false,
      signed_url_expiry_seconds: 600
    })
  })

  it('edits a bucket by name', async () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      name: 'avatars'
    })

    await storage.editBucket('avatars', {
      allowOverwrite: false,
      public: true
    })

    expect(requests[0]?.url).toBe('https://storage.example.test/buckets/avatars')
    expect(requests[0]?.init.method).toBe('PATCH')
    expectJsonBody(requests[0]?.init.body, {
      allow_overwrite: false,
      public: true
    })
  })

  it('encodes object keys as one path segment', async () => {
    const requests: CapturedRequest[] = []
    const metadata = {
      owner: 'user-1'
    }
    const storage = createStorage(requests, {
      object: {},
      uploaded: true
    })

    await storage.uploadObject('avatars', 'users/1.png', 'content', {
      contentType: 'image/png',
      metadata
    })

    expect(requests[0]?.url).toBe(
      'https://storage.example.test/buckets/avatars/objects/users%2F1.png'
    )
    expect(new Headers(requests[0]?.init.headers).get('content-type')).toBe('image/png')
    expect(new Headers(requests[0]?.init.headers).get('content-length')).toBe('7')
    expect(decodeMetadata(new Headers(requests[0]?.init.headers))).toEqual(metadata)
  })

  it('infers content length for typed arrays', async () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      object: {},
      uploaded: true
    })

    await storage.uploadObject('avatars', 'bytes.bin', new Uint8Array([1, 2, 3]), {
      contentType: 'application/octet-stream'
    })

    expect(new Headers(requests[0]?.init.headers).get('content-length')).toBe('3')
  })

  it('infers content length for URLSearchParams', async () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      object: {},
      uploaded: true
    })

    await storage.uploadObject('forms', 'payload.txt', new URLSearchParams({ a: '1', b: '2' }))

    expect(new Headers(requests[0]?.init.headers).get('content-length')).toBe('7')
  })

  it('rejects FormData uploads at runtime', () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      object: {},
      uploaded: true
    })

    expect(() => storage.uploadObject('forms', 'multipart', new FormData() as never)).toThrowError(
      'FormData uploads are not supported'
    )
  })

  it('requires content length for streams', () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      object: {},
      uploaded: true
    })

    expect(() => storage.uploadObject('raw', 'stream.bin', new ReadableStream())).toThrowError(
      'contentLength is required'
    )
  })

  it('copies an object into the destination path', async () => {
    const requests: CapturedRequest[] = []
    const metadata = {
      owner: 'user-1'
    }
    const storage = createStorage(requests, {
      destinationBucketName: 'backup',
      destinationKey: 'users/1.png',
      etag: 'etag',
      success: true
    })

    await storage.copyObject('backup', 'users/1.png', {
      cacheControl: 'public, max-age=60',
      contentType: 'image/png',
      metadata,
      originBucket: 'avatars',
      originKey: 'users/1.png'
    })

    expect(requests[0]?.url).toBe(
      'https://storage.example.test/buckets/backup/objects/users%2F1.png/copy'
    )
    expect(requests[0]?.init.method).toBe('PUT')
    expectJsonBody(requests[0]?.init.body, {
      cacheControl: 'public, max-age=60',
      contentType: 'image/png',
      objectMetadata: metadata,
      originBucket: 'avatars',
      originKey: 'users/1.png'
    })
  })

  it('downloads an object with response header metadata', async () => {
    const requests: CapturedRequest[] = []
    const metadata = {
      owner: 'user-1'
    }
    const storage = createStorage(
      requests,
      new Blob(['content'], {
        type: 'image/png'
      }),
      {
        'cache-control': 'public, max-age=60',
        'content-length': '7',
        'content-type': 'image/png',
        etag: 'etag-1',
        'x-jupiter-object-created-at': '2026-07-05T12:00:00.000Z',
        'x-jupiter-object-metadata': encodeMetadata(metadata),
        'x-jupiter-object-updated-at': '2026-07-05T12:30:00.000Z'
      }
    )

    const result = await storage.downloadObject('avatars', 'users/1.png')

    expect(requests[0]?.url).toBe(
      'https://storage.example.test/buckets/avatars/objects/users%2F1.png/download'
    )
    expect(result.error).toBeNull()
    expect(result.data?.body).toBeInstanceOf(Blob)
    expect(result.data?.headers).toEqual({
      cacheControl: 'public, max-age=60',
      contentLength: 7,
      contentType: 'image/png',
      createdAt: '2026-07-05T12:00:00.000Z',
      etag: 'etag-1',
      metadata,
      updatedAt: '2026-07-05T12:30:00.000Z'
    })
  })

  it('starts multipart uploads with key query and metadata headers', async () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      bucket: 'videos',
      key: 'raw/a.mov',
      upload_id: 'upload-1'
    })

    await storage.startMultipartUpload('videos', {
      contentType: 'video/quicktime',
      key: 'raw/a.mov',
      metadata: {
        source: 'camera'
      }
    })

    expect(requests[0]?.url).toBe(
      'https://storage.example.test/buckets/videos/multipart/start?key=raw%2Fa.mov'
    )
    expect(requests[0]?.init.method).toBe('POST')
    expect(new Headers(requests[0]?.init.headers).get('content-type')).toBe('video/quicktime')
    expect(decodeMetadata(new Headers(requests[0]?.init.headers))).toEqual({
      source: 'camera'
    })
  })

  it('completes multipart uploads with selected part numbers', async () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      object_data: {},
      uploaded: true
    })

    await storage.completeMultipartUpload('videos', 'upload-1', {
      partNumbers: [1, 2]
    })

    expect(requests[0]?.url).toBe(
      'https://storage.example.test/buckets/videos/multipart/upload/upload-1/complete'
    )
    expect(requests[0]?.init.method).toBe('POST')
    expectJsonBody(requests[0]?.init.body, {
      parts: [
        {
          part_number: 1
        },
        {
          part_number: 2
        }
      ]
    })
  })

  it('rejects FormData multipart part uploads at runtime', () => {
    const requests: CapturedRequest[] = []
    const storage = createStorage(requests, {
      etag: 'etag-1',
      part_number: 1,
      part_size: 1
    })

    expect(() =>
      storage.uploadMultipartPart('videos', 'upload-1', new FormData() as never, {
        contentLength: 1,
        partNumber: 1
      })
    ).toThrowError('FormData uploads are not supported')
  })
})

type CapturedRequest = {
  init: RequestInit
  url: string
}

function createStorage(
  requests: CapturedRequest[],
  responseBody: BodyInit | object,
  responseHeaders?: HeadersInit
): JupiterStorage {
  return new JupiterStorage('https://storage.example.test', {
    fetch: (input, init = {}) => {
      requests.push({
        init,
        url: toRequestUrl(input)
      })

      if (isBodyInit(responseBody)) {
        return Promise.resolve(new Response(responseBody, createResponseInit(responseHeaders)))
      }

      return Promise.resolve(Response.json(responseBody, createResponseInit(responseHeaders)))
    },
    projectId: 'project-1',
    token: 'token-1'
  })
}

function expectJsonBody(body: BodyInit | null | undefined, expected: unknown): void {
  expect(typeof body).toBe('string')
  expect(JSON.parse(stringBody(body))).toEqual(expected)
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

function stringBody(body: BodyInit | null | undefined): string {
  return typeof body === 'string' ? body : ''
}

function encodeMetadata(metadata: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(metadata))
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function decodeMetadata(headers: Headers): unknown {
  const encodedMetadata = headers.get('X-Jupiter-Object-Metadata')

  if (encodedMetadata === null) {
    return undefined
  }

  const binary = atob(encodedMetadata)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return JSON.parse(new TextDecoder().decode(bytes))
}

function createResponseInit(headers: HeadersInit | undefined): ResponseInit {
  if (headers === undefined) {
    return {}
  }

  return { headers }
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream ||
    value instanceof DataView
  )
}
