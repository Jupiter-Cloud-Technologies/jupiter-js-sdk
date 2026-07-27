import {
  HttpClient,
  JUPITER_PROJECT_ID_HEADER,
  createHeaders,
  type HttpClientOptions,
  type RequestOptions
} from '@jupiter-cloud/core'
import type {
  AbortMultipartUploadResponse,
  AbortMultipartUploadParams,
  Bucket,
  BulkDeleteObjectsResponse,
  CompleteMultipartUploadParams,
  CompleteMultipartUploadResponse,
  CopyMultipartPartParams,
  CopyObjectParams,
  CopyObjectResponse,
  CountObjectsParams,
  CountObjectsResponse,
  CreateBucketOptions,
  CreateBucketRequest,
  DeleteBucketParams,
  DeleteBucketResponse,
  DeleteObjectParams,
  DeleteObjectResponse,
  DeleteObjectsParams,
  DownloadObjectParams,
  DownloadObjectResponse,
  FlushBucketParams,
  FlushBucketResponse,
  GetBucketParams,
  GetMultipartUploadParams,
  GetMultipartUploadPartParams,
  GetObjectMetadataParams,
  GetMultipartPartResponse,
  GetMultipartUploadResponse,
  ListBucketsResponse,
  ListMultipartUploadPartsParams,
  ListMultipartUploadsParams,
  ListMultipartPartsResponse,
  ListMultipartUploadsResponse,
  ListObjectsParams,
  ListObjectsResponse,
  MultipartPartUploadResponse,
  MultipartStartResponse,
  StartMultipartUploadParams,
  JupiterStorageOptions,
  StorageResult,
  UpdateBucketParams,
  UpdateBucketOptions,
  UpdateBucketRequest,
  UpdateObjectAttributesParams,
  UpdateObjectAttributesResponse,
  UploadBody,
  UploadMultipartPartParams,
  UploadObjectParams,
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
  getBucket({ bucketName }: GetBucketParams): StorageResult<Bucket> {
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
  editBucket(params: UpdateBucketParams): StorageResult<Bucket> {
    const { bucketName, ...options } = params

    return this.request<Bucket>(`/buckets/${encodePathSegment(bucketName)}`, {
      body: toUpdateBucketRequest(options),
      method: 'PATCH'
    })
  }

  /**
   * Alias for `editBucket`.
   */
  updateBucket(params: UpdateBucketParams): StorageResult<Bucket> {
    return this.editBucket(params)
  }

  /**
   * Delete a bucket.
   */
  deleteBucket({
    bucketName,
    forceFlush,
    signal
  }: DeleteBucketParams): StorageResult<DeleteBucketResponse> {
    const requestOptions: RequestOptions = {
      method: 'DELETE'
    }

    if (forceFlush !== undefined) {
      requestOptions.body = {
        force_flush: forceFlush
      }
    }

    if (signal !== undefined) {
      requestOptions.signal = signal
    }

    return this.request<DeleteBucketResponse>(
      `/buckets/${encodePathSegment(bucketName)}`,
      requestOptions
    )
  }

  /**
   * Delete all objects and active multipart uploads in a bucket.
   */
  flushBucket({ bucketName, signal }: FlushBucketParams): StorageResult<FlushBucketResponse> {
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
  countObjects({ bucketName }: CountObjectsParams): StorageResult<CountObjectsResponse> {
    return this.request<CountObjectsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects/count`
    )
  }

  /**
   * List objects in a bucket.
   */
  listObjects({
    bucketName,
    cursor,
    limit,
    prefix
  }: ListObjectsParams): StorageResult<ListObjectsResponse> {
    return this.request<ListObjectsResponse>(`/buckets/${encodePathSegment(bucketName)}/objects`, {
      query: {
        cursor,
        limit,
        prefix
      }
    })
  }

  /**
   * Upload object bytes directly.
   */
  uploadObject(params: UploadObjectParams): StorageResult<UploadObjectResponse> {
    const { bucketName, key, body, cacheControl, contentLength, contentType, metadata, signal } =
      params

    assertSupportedUploadBody(body)
    const inferredContentLength = contentLength ?? inferBodyLength(body)

    if (inferredContentLength === undefined) {
      throw new TypeError(
        'contentLength is required when uploading a body whose size cannot be inferred.'
      )
    }

    const requestOptions = withSignal(
      {
        body,
        headers: {
          'cache-control': cacheControl,
          'content-length': String(inferredContentLength),
          'content-type': contentType,
          'X-Jupiter-Object-Metadata': metadata ? encodeMetadataHeader(metadata) : undefined
        },
        method: 'PUT'
      },
      signal
    )

    return this.request<UploadObjectResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects/${encodePathSegment(key)}`,
      requestOptions
    )
  }

  /**
   * Download object bytes.
   */
  downloadObject({
    bucketName,
    key,
    signal
  }: DownloadObjectParams): StorageResult<DownloadObjectResponse> {
    const requestOptions: RequestOptions = {}

    if (signal !== undefined) {
      requestOptions.signal = signal
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
  getObjectMetadata({
    bucketName,
    key,
    signal
  }: GetObjectMetadataParams): StorageResult<UploadObjectResponse['object']> {
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
    params: UpdateObjectAttributesParams
  ): StorageResult<UpdateObjectAttributesResponse> {
    const { bucketName, key, attributes, signal } = params

    const requestOptions = withSignal(
      {
        body: {
          attributes
        },
        method: 'PATCH'
      },
      signal
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
    params: UpdateObjectAttributesParams
  ): StorageResult<UpdateObjectAttributesResponse> {
    return this.editObjectAttributes(params)
  }

  /**
   * Delete one object.
   */
  deleteObject({
    bucketName,
    key,
    signal
  }: DeleteObjectParams): StorageResult<DeleteObjectResponse> {
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
  deleteObjects({
    bucketName,
    keys,
    signal
  }: DeleteObjectsParams): StorageResult<BulkDeleteObjectsResponse> {
    const requestOptions = withSignal(
      {
        body: keys,
        method: 'DELETE'
      },
      signal
    )

    return this.request<BulkDeleteObjectsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/objects`,
      requestOptions
    )
  }

  /**
   * Copy an object into a destination bucket/key.
   */
  copyObject(params: CopyObjectParams): StorageResult<CopyObjectResponse> {
    const {
      cacheControl,
      contentType,
      destinationBucketName,
      destinationKey,
      metadata,
      originBucket,
      originKey,
      signal
    } = params

    const requestOptions = withSignal(
      {
        body: {
          cacheControl,
          contentType,
          objectMetadata: metadata,
          originBucket,
          originKey
        },
        method: 'PUT'
      },
      signal
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
  listMultipartUploads({
    bucketName,
    cursor,
    limit
  }: ListMultipartUploadsParams): StorageResult<ListMultipartUploadsResponse> {
    return this.request<ListMultipartUploadsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart`,
      {
        query: {
          cursor,
          limit
        }
      }
    )
  }

  /**
   * Start a multipart upload.
   */
  startMultipartUpload(params: StartMultipartUploadParams): StorageResult<MultipartStartResponse> {
    const { bucketName, cacheControl, contentType, key, metadata, signal } = params

    const requestOptions = withSignal(
      {
        headers: {
          'cache-control': cacheControl,
          'content-type': contentType,
          'X-Jupiter-Object-Metadata': metadata ? encodeMetadataHeader(metadata) : undefined
        },
        method: 'POST',
        query: {
          key
        }
      },
      signal
    )

    return this.request<MultipartStartResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/start`,
      requestOptions
    )
  }

  /**
   * Get a multipart upload and a page of its parts.
   */
  getMultipartUpload({
    bucketName,
    cursor,
    limit,
    uploadId
  }: GetMultipartUploadParams): StorageResult<GetMultipartUploadResponse> {
    return this.request<GetMultipartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(uploadId)}`,
      {
        query: {
          cursor,
          limit
        }
      }
    )
  }

  /**
   * Abort a multipart upload.
   */
  abortMultipartUpload({
    bucketName,
    signal,
    uploadId
  }: AbortMultipartUploadParams): StorageResult<AbortMultipartUploadResponse> {
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
    params: UploadMultipartPartParams
  ): StorageResult<MultipartPartUploadResponse> {
    const { body, bucketName, contentLength, partNumber, signal, uploadId } = params

    assertSupportedUploadBody(body)

    const requestOptions = withSignal(
      {
        body,
        headers: {
          'content-length': String(contentLength),
          'part-number': String(partNumber)
        },
        method: 'POST'
      },
      signal
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
  copyMultipartPart(params: CopyMultipartPartParams): StorageResult<MultipartPartUploadResponse> {
    const { bucketName, key, partNumber, signal, uploadId } = params

    const requestOptions = withSignal(
      {
        headers: {
          'part-number': String(partNumber)
        },
        method: 'POST'
      },
      signal
    )

    return this.request<MultipartPartUploadResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/part/copy/${encodePathSegment(key)}`,
      requestOptions
    )
  }

  /**
   * List uploaded parts for a multipart upload.
   */
  listMultipartUploadParts({
    bucketName,
    cursor,
    limit,
    uploadId
  }: ListMultipartUploadPartsParams): StorageResult<ListMultipartPartsResponse> {
    return this.request<ListMultipartPartsResponse>(
      `/buckets/${encodePathSegment(bucketName)}/multipart/upload/${encodePathSegment(
        uploadId
      )}/parts`,
      {
        query: {
          cursor,
          limit
        }
      }
    )
  }

  /**
   * Get one multipart upload part.
   */
  getMultipartUploadPart({
    bucketName,
    partNumber,
    uploadId
  }: GetMultipartUploadPartParams): StorageResult<GetMultipartPartResponse> {
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
    params: CompleteMultipartUploadParams
  ): StorageResult<CompleteMultipartUploadResponse> {
    const { bucketName, partNumbers, signal, uploadId } = params

    const requestOptions: RequestOptions = {
      method: 'POST'
    }

    if (partNumbers !== undefined) {
      requestOptions.body = {
        parts: partNumbers.map((partNumber) => ({
          part_number: partNumber
        }))
      }
    }

    if (signal !== undefined) {
      requestOptions.signal = signal
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
