import {
  HttpClient,
  JUPITER_PROJECT_ID_HEADER,
  createHeaders,
  type HttpClientOptions,
  type RequestOptions
} from '@jupiter-cloud/core'
import type {
  AbortMultipartUploadResponse,
  Bucket,
  BucketName,
  BulkDeleteObjectsResponse,
  CompleteMultipartUploadOptions,
  CompleteMultipartUploadResponse,
  CopyMultipartPartOptions,
  CopyObjectOptions,
  CopyObjectResponse,
  CountObjectsResponse,
  CreateBucketOptions,
  CreateBucketRequest,
  DeleteBucketResponse,
  DeleteObjectResponse,
  DeleteObjectsOptions,
  DownloadObjectOptions,
  DownloadObjectResponse,
  FlushBucketResponse,
  GetMultipartPartResponse,
  GetMultipartUploadResponse,
  ListBucketsResponse,
  ListMultipartPartsOptions,
  ListMultipartPartsResponse,
  ListMultipartUploadsOptions,
  ListMultipartUploadsResponse,
  ListObjectsOptions,
  ListObjectsResponse,
  MultipartPartUploadResponse,
  MultipartStartResponse,
  ObjectKey,
  PartNumber,
  StartMultipartUploadOptions,
  JupiterStorageOptions,
  StorageResult,
  UpdateBucketOptions,
  UpdateBucketRequest,
  UpdateObjectAttributesResponse,
  UpdateObjectOptions,
  UploadBody,
  UploadId,
  UploadMultipartPartOptions,
  UploadObjectOptions,
  UploadObjectResponse
} from './types'

/**
 * Client for Jupiter Storage.
 *
 * This class intentionally exposes service-level methods directly. Users should call
 * `jupiter.storage.createBucket(...)`, `jupiter.storage.uploadObject(...)`, and similar
 * methods instead of first creating a bucket-scoped sub-client.
 */
export class JupiterStorage {
  readonly http: HttpClient
  readonly projectId: string

  constructor(url: string, options: JupiterStorageOptions) {
    this.projectId = options.projectId

    const headers = createHeaders(options.headers, {
      Authorization: options.token ? `Bearer ${options.token}` : undefined,
      [JUPITER_PROJECT_ID_HEADER]: options.projectId
    })

    const httpOptions: HttpClientOptions = {
      fetch: options.fetch,
      headers,
      retry: {
        attempts: options.retryAttempts ?? 1
      },
      timeoutMs: options.timeoutMs
    }

    this.http = new HttpClient(url, httpOptions)
  }

  private request<TData>(path: string, options: RequestOptions = {}): StorageResult<TData> {
    return this.http.request<TData>(path, options) as StorageResult<TData>
  }

  /**
   * List buckets in the current project.
   */
  listBuckets(): StorageResult<ListBucketsResponse> {
    return this.request<ListBucketsResponse>('/buckets')
  }

  /**
   * Get one bucket by name.
   */
  getBucket(bucketName: BucketName): StorageResult<Bucket> {
    return this.request<Bucket>(`/buckets/${encodePathSegment(bucketName)}`)
  }

  /**
   * Create a bucket.
   */
  createBucket(options: CreateBucketOptions): StorageResult<Bucket> {
    return this.request<Bucket>('/buckets', {
      body: toCreateBucketRequest(options),
      method: 'POST'
    })
  }

  /**
   * Edit bucket settings.
   */
  editBucket(bucketName: BucketName, options: UpdateBucketOptions): StorageResult<Bucket> {
    return this.request<Bucket>(`/buckets/${encodePathSegment(bucketName)}`, {
      body: toUpdateBucketRequest(options),
      method: 'PATCH'
    })
  }

  /**
   * Alias for `editBucket`.
   */
  updateBucket(bucketName: BucketName, options: UpdateBucketOptions): StorageResult<Bucket> {
    return this.editBucket(bucketName, options)
  }

  /**
   * Delete a bucket.
   */
  deleteBucket(
    bucketName: BucketName,
    options: { forceFlush?: boolean; signal?: AbortSignal } = {}
  ): StorageResult<DeleteBucketResponse> {
    const requestOptions: RequestOptions = {
      method: 'DELETE'
    }

    if (options.forceFlush !== undefined) {
      requestOptions.body = {
        force_flush: options.forceFlush
      }
    }

    if (options.signal !== undefined) {
      requestOptions.signal = options.signal
    }

    return this.request<DeleteBucketResponse>(
      `/buckets/${encodePathSegment(bucketName)}`,
      requestOptions
    )
  }

  /**
   * Delete all objects and active multipart uploads in a bucket.
   */
  flushBucket(bucketName: BucketName, signal?: AbortSignal): StorageResult<FlushBucketResponse> {
    const options: RequestOptions = {
      method: 'DELETE'
    }

    if (signal !== undefined) {
      options.signal = signal
    }

    return this.request<FlushBucketResponse>(
      `/buckets/${encodePathSegment(bucketName)}/flush`,
      options
    )
  }

  /**
   * Count objects in a bucket.
   */
  countObjects(bucketName: BucketName): StorageResult<CountObjectsResponse> {
    return this.request<CountObjectsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects/count`
    )
  }

  /**
   * List objects in a bucket.
   */
  listObjects(
    bucketName: BucketName,
    options: ListObjectsOptions = {}
  ): StorageResult<ListObjectsResponse> {
    return this.request<ListObjectsResponse>(`/buckets/${encodePathSegment(bucketName)}/objects`, {
      query: {
        cursor: options.cursor,
        limit: options.limit,
        prefix: options.prefix
      }
    })
  }

  /**
   * Upload object bytes directly.
   */
  uploadObject(
    bucketName: BucketName,
    key: ObjectKey,
    body: UploadBody,
    options: UploadObjectOptions = {}
  ): StorageResult<UploadObjectResponse> {
    assertSupportedUploadBody(body)
    const contentLength = options.contentLength ?? inferBodyLength(body)

    if (contentLength === undefined) {
      throw new TypeError(
        'contentLength is required when uploading a body whose size cannot be inferred.'
      )
    }

    const requestOptions = withSignal(
      {
        body,
        headers: {
          'cache-control': options.cacheControl,
          'content-length': String(contentLength),
          'content-type': options.contentType,
          'X-Jupiter-Object-Metadata': options.metadata
            ? encodeMetadataHeader(options.metadata)
            : undefined
        },
        method: 'PUT'
      },
      options.signal
    )

    return this.request<UploadObjectResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects/${encodePathSegment(key)}`,
      requestOptions
    )
  }

  /**
   * Download object bytes.
   */
  downloadObject(
    bucketName: BucketName,
    key: ObjectKey,
    options: DownloadObjectOptions = {}
  ): StorageResult<DownloadObjectResponse> {
    const requestOptions: RequestOptions = {}

    if (options.signal !== undefined) {
      requestOptions.signal = options.signal
    }

    return this.request<Blob>(
      `/buckets/${encodePathSegment(bucketName)}/objects/${encodePathSegment(key)}/download`,
      requestOptions
    ).then((result): Awaited<StorageResult<DownloadObjectResponse>> => {
      if (result.error !== null) {
        return {
          data: null,
          error: result.error,
          response: result.response
        }
      }

      const body = normalizeDownloadBody(result.data)

      if (body === null) {
        return {
          data: null,
          error: {
            code: 'jupiter.invalid_response',
            detail: 'Download response did not include an object body.',
            status: result.response.status,
            title: 'Invalid response',
            type: 'about:blank'
          },
          response: result.response
        }
      }

      return {
        data: {
          body,
          headers: parseDownloadObjectHeaders(result.response.headers)
        },
        error: null,
        response: result.response
      }
    })
  }

  /**
   * Get object metadata without downloading bytes.
   */
  getObjectMetadata(
    bucketName: BucketName,
    key: ObjectKey,
    signal?: AbortSignal
  ): StorageResult<UploadObjectResponse['object']> {
    const options: RequestOptions = {}

    if (signal !== undefined) {
      options.signal = signal
    }

    return this.request<UploadObjectResponse['object']>(
      `/buckets/${encodePathSegment(bucketName)}/objects/${encodePathSegment(key)}/metadata`,
      options
    )
  }

  /**
   * Edit object attributes.
   */
  editObjectAttributes(
    bucketName: BucketName,
    key: ObjectKey,
    options: UpdateObjectOptions
  ): StorageResult<UpdateObjectAttributesResponse> {
    const requestOptions = withSignal(
      {
        body: {
          attributes: options.attributes
        },
        method: 'PATCH'
      },
      options.signal
    )

    return this.request<UpdateObjectAttributesResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects/${encodePathSegment(key)}`,
      requestOptions
    )
  }

  /**
   * Alias for `editObjectAttributes`.
   */
  updateObjectAttributes(
    bucketName: BucketName,
    key: ObjectKey,
    options: UpdateObjectOptions
  ): StorageResult<UpdateObjectAttributesResponse> {
    return this.editObjectAttributes(bucketName, key, options)
  }

  /**
   * Delete one object.
   */
  deleteObject(
    bucketName: BucketName,
    key: ObjectKey,
    signal?: AbortSignal
  ): StorageResult<DeleteObjectResponse> {
    const options: RequestOptions = {
      method: 'DELETE'
    }

    if (signal !== undefined) {
      options.signal = signal
    }

    return this.request<DeleteObjectResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects/${encodePathSegment(key)}`,
      options
    )
  }

  /**
   * Delete multiple objects.
   */
  deleteObjects(
    bucketName: BucketName,
    options: DeleteObjectsOptions
  ): StorageResult<BulkDeleteObjectsResponse> {
    const requestOptions = withSignal(
      {
        body: options.keys,
        method: 'DELETE'
      },
      options.signal
    )

    return this.request<BulkDeleteObjectsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects`,
      requestOptions
    )
  }

  /**
   * Copy an object into a destination bucket/key.
   */
  copyObject(
    destinationBucketName: BucketName,
    destinationKey: ObjectKey,
    options: CopyObjectOptions
  ): StorageResult<CopyObjectResponse> {
    const requestOptions = withSignal(
      {
        body: {
          cacheControl: options.cacheControl,
          contentType: options.contentType,
          objectMetadata: options.metadata,
          originBucket: options.originBucket,
          originKey: options.originKey
        },
        method: 'PUT'
      },
      options.signal
    )

    return this.request<CopyObjectResponse>(
      `/buckets/${encodePathSegment(destinationBucketName)}/objects/${encodePathSegment(
        destinationKey
      )}/copy`,
      requestOptions
    )
  }

  /**
   * List active multipart uploads in a bucket.
   */
  listMultipartUploads(
    bucketName: BucketName,
    options: ListMultipartUploadsOptions = {}
  ): StorageResult<ListMultipartUploadsResponse> {
    return this.request<ListMultipartUploadsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart`,
      {
        query: {
          cursor: options.cursor,
          limit: options.limit
        }
      }
    )
  }

  /**
   * Start a multipart upload.
   */
  startMultipartUpload(
    bucketName: BucketName,
    options: StartMultipartUploadOptions
  ): StorageResult<MultipartStartResponse> {
    const requestOptions = withSignal(
      {
        headers: {
          'cache-control': options.cacheControl,
          'content-type': options.contentType,
          'X-Jupiter-Object-Metadata': options.metadata
            ? encodeMetadataHeader(options.metadata)
            : undefined
        },
        method: 'POST',
        query: {
          key: options.key
        }
      },
      options.signal
    )

    return this.request<MultipartStartResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/start`,
      requestOptions
    )
  }

  /**
   * Get a multipart upload and a page of its parts.
   */
  getMultipartUpload(
    bucketName: BucketName,
    uploadId: UploadId,
    options: ListMultipartPartsOptions = {}
  ): StorageResult<GetMultipartUploadResponse> {
    return this.request<GetMultipartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(uploadId)}`,
      {
        query: {
          cursor: options.cursor,
          limit: options.limit
        }
      }
    )
  }

  /**
   * Abort a multipart upload.
   */
  abortMultipartUpload(
    bucketName: BucketName,
    uploadId: UploadId,
    signal?: AbortSignal
  ): StorageResult<AbortMultipartUploadResponse> {
    const options: RequestOptions = {
      method: 'DELETE'
    }

    if (signal !== undefined) {
      options.signal = signal
    }

    return this.request<AbortMultipartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(uploadId)}`,
      options
    )
  }

  /**
   * Upload bytes for one multipart part.
   */
  uploadMultipartPart(
    bucketName: BucketName,
    uploadId: UploadId,
    body: UploadBody,
    options: UploadMultipartPartOptions
  ): StorageResult<MultipartPartUploadResponse> {
    assertSupportedUploadBody(body)

    const requestOptions = withSignal(
      {
        body,
        headers: {
          'content-length': String(options.contentLength),
          'part-number': String(options.partNumber)
        },
        method: 'POST'
      },
      options.signal
    )

    return this.request<MultipartPartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/part`,
      requestOptions
    )
  }

  /**
   * Copy an existing object in the same bucket as one multipart part.
   */
  copyMultipartPart(
    bucketName: BucketName,
    uploadId: UploadId,
    options: CopyMultipartPartOptions
  ): StorageResult<MultipartPartUploadResponse> {
    const requestOptions = withSignal(
      {
        headers: {
          'part-number': String(options.partNumber)
        },
        method: 'POST'
      },
      options.signal
    )

    return this.request<MultipartPartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/part/copy/${encodePathSegment(options.key)}`,
      requestOptions
    )
  }

  /**
   * List uploaded parts for a multipart upload.
   */
  listMultipartUploadParts(
    bucketName: BucketName,
    uploadId: UploadId,
    options: ListMultipartPartsOptions = {}
  ): StorageResult<ListMultipartPartsResponse> {
    return this.request<ListMultipartPartsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/parts`,
      {
        query: {
          cursor: options.cursor,
          limit: options.limit
        }
      }
    )
  }

  /**
   * Get one multipart upload part.
   */
  getMultipartUploadPart(
    bucketName: BucketName,
    uploadId: UploadId,
    partNumber: PartNumber
  ): StorageResult<GetMultipartPartResponse> {
    return this.request<GetMultipartPartResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/parts/${partNumber}`
    )
  }

  /**
   * Complete a multipart upload.
   */
  completeMultipartUpload(
    bucketName: BucketName,
    uploadId: UploadId,
    options: CompleteMultipartUploadOptions = {}
  ): StorageResult<CompleteMultipartUploadResponse> {
    const requestOptions: RequestOptions = {
      method: 'POST'
    }

    if (options.partNumbers !== undefined) {
      requestOptions.body = {
        parts: options.partNumbers.map((partNumber) => ({
          part_number: partNumber
        }))
      }
    }

    if (options.signal !== undefined) {
      requestOptions.signal = options.signal
    }

    return this.request<CompleteMultipartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/complete`,
      requestOptions
    )
  }
}

function toCreateBucketRequest(options: CreateBucketOptions): CreateBucketRequest {
  const request: CreateBucketRequest = {
    location: options.location,
    name: options.name
  }

  if (options.allowOverwrite !== undefined) {
    request.allow_overwrite = options.allowOverwrite
  }

  if (options.allowedMimeTypes !== undefined) {
    request.allowed_mime_types = options.allowedMimeTypes
  }

  if (options.attributes !== undefined) {
    request.attributes = options.attributes
  }

  if (options.fileSizeLimit !== undefined) {
    request.file_size_limit = options.fileSizeLimit
  }

  if (options.public !== undefined) {
    request.public = options.public
  }

  if (options.signedUrlExpirySeconds !== undefined) {
    request.signed_url_expiry_seconds = options.signedUrlExpirySeconds
  }

  return request
}

function toUpdateBucketRequest(options: UpdateBucketOptions): UpdateBucketRequest {
  const request: UpdateBucketRequest = {}

  if (options.allowOverwrite !== undefined) {
    request.allow_overwrite = options.allowOverwrite
  }

  if (options.allowedMimeTypes !== undefined) {
    request.allowed_mime_types = options.allowedMimeTypes
  }

  if (options.attributes !== undefined) {
    request.attributes = options.attributes
  }

  if (options.fileSizeLimit !== undefined) {
    request.file_size_limit = options.fileSizeLimit
  }

  if (options.public !== undefined) {
    request.public = options.public
  }

  if (options.signedUrlExpirySeconds !== undefined) {
    request.signed_url_expiry_seconds = options.signedUrlExpirySeconds
  }

  return request
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

function withSignal<TOptions extends RequestOptions>(
  options: TOptions,
  signal: AbortSignal | undefined
): TOptions {
  if (signal !== undefined) {
    options.signal = signal
  }

  return options
}

function assertSupportedUploadBody(body: BodyInit): asserts body is UploadBody {
  if (body instanceof FormData) {
    throw new TypeError(
      'FormData uploads are not supported. Use Blob, File, ArrayBuffer, typed arrays, string, URLSearchParams, or ReadableStream.'
    )
  }
}

function normalizeDownloadBody(body: Blob | null): Blob | null {
  return body
}

function parseDownloadObjectHeaders(headers: Headers): DownloadObjectResponse['headers'] {
  const contentLength = headers.get('content-length')
  const metadata = headers.get('x-jupiter-object-metadata')
  const parsedHeaders: DownloadObjectResponse['headers'] = {}

  setIfPresent(parsedHeaders, 'contentType', headers.get('content-type'))
  setIfPresent(parsedHeaders, 'etag', headers.get('etag'))
  setIfPresent(parsedHeaders, 'cacheControl', headers.get('cache-control'))
  setIfPresent(parsedHeaders, 'createdAt', headers.get('x-jupiter-object-created-at'))
  setIfPresent(parsedHeaders, 'updatedAt', headers.get('x-jupiter-object-updated-at'))

  if (contentLength !== null) {
    const parsedContentLength = Number.parseInt(contentLength, 10)

    if (!Number.isNaN(parsedContentLength)) {
      parsedHeaders.contentLength = parsedContentLength
    }
  }

  if (metadata !== null) {
    const decodedMetadata = decodeMetadataHeader(metadata)

    if (decodedMetadata !== undefined) {
      parsedHeaders.metadata = decodedMetadata
    }
  }

  return parsedHeaders
}

function setIfPresent<TObject extends object, TKey extends keyof TObject>(
  object: TObject,
  key: TKey,
  value: TObject[TKey] | null
): void {
  if (value !== null) {
    object[key] = value
  }
}

function encodeMetadataHeader(metadata: object): string {
  return encodeBase64(JSON.stringify(metadata))
}

function decodeMetadataHeader(
  metadata: string
): DownloadObjectResponse['headers']['metadata'] | undefined {
  const decoded = decodeBase64(metadata)
  const parsed = JSON.parse(decoded) as unknown

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined
  }

  return parsed as DownloadObjectResponse['headers']['metadata']
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function decodeBase64(value: string): string {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

function inferBodyLength(body: UploadBody): number | undefined {
  if (typeof body === 'string') {
    return new TextEncoder().encode(body).byteLength
  }

  if (body instanceof Blob) {
    return body.size
  }

  if (body instanceof ArrayBuffer) {
    return body.byteLength
  }

  if (ArrayBuffer.isView(body)) {
    return body.byteLength
  }

  if (body instanceof URLSearchParams) {
    return new TextEncoder().encode(body.toString()).byteLength
  }

  return undefined
}
