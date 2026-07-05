import type { Fetch, JsonObject, JupiterErrorPayload, JupiterResult } from '@jupiter-cloud/core'

/**
 * ISO-8601 timestamp string returned by the Storage API.
 *
 * Example: `2026-07-05T12:34:56.000Z`.
 */
export type IsoTimestamp = string

/**
 * Project identifier used to scope every storage operation.
 */
export type ProjectId = string

/**
 * Bucket name within a Jupiter project.
 */
export type BucketName = string

/**
 * Object key inside a bucket.
 *
 * When used in a URL path, the full key must be encoded as one path segment with
 * `encodeURIComponent`. For example, `folder/a.txt` becomes `folder%2Fa.txt`.
 */
export type ObjectKey = string

/**
 * Multipart upload identifier returned by the start multipart upload endpoint.
 */
export type UploadId = string

/**
 * Multipart part number.
 *
 * Jupiter Storage accepts part numbers from `1` through `10000`.
 */
export type PartNumber = number

/**
 * An entity tag (ETag) is an opaque identifier assigned by the storage service
 * to a specific version of an object or multipart part.
 */
export type ETag = string

/**
 * Number of bytes in an object, request body, or multipart part.
 */
export type ByteLength = number

/**
 * Cursor returned by a previous paginated request.
 */
export type Cursor = string

/**
 * Page size for list operations.
 *
 * The Storage API clamps values to the range `1` through `1000`.
 */
export type PageLimit = number

/**
 * Storage location code accepted by Jupiter Storage.
 *
 * - `apac`: Asia Pacific
 * - `eeur`: Eastern Europe
 * - `enam`: Eastern North America
 * - `oc`: Oceania
 * - `weur`: Western Europe
 * - `wnam`: Western North America
 */
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]

/**
 * All supported Jupiter Storage location codes.
 */
export const STORAGE_LOCATIONS = ['apac', 'eeur', 'enam', 'oc', 'weur', 'wnam'] as const

/**
 * User-defined JSON-compatible metadata attached to buckets, objects, or multipart uploads.
 */
export type StorageAttributes = JsonObject

/**
 * Machine-readable error codes returned by the Storage API.
 */
export const STORAGE_ERROR_CODES = [
  'storage.bad_request',
  'storage.project_id_required',
  'storage.bucket_name_required',
  'storage.bucket_not_found',
  'storage.bucket_already_exists',
  'storage.bucket_not_empty',
  'storage.object_not_found',
  'storage.object_already_exists',
  'storage.object_key_required',
  'storage.invalid_location',
  'storage.invalid_bucket_name',
  'storage.not_found',
  'storage.conflict',
  'storage.internal_error',
  'storage.database_error'
] as const

/**
 * Stable dot-namespaced Storage API error code.
 */
export type StorageErrorCode = (typeof STORAGE_ERROR_CODES)[number]

/**
 * Error response body returned by Storage API failures.
 *
 * The API serializes errors as RFC 9457 `application/problem+json`.
 */
export type ProblemDetails = JupiterErrorPayload<StorageErrorCode>

/**
 * Storage API error payload returned in failed `StorageResult` values.
 */
export type StorageError = ProblemDetails

/**
 * Bucket record returned by the Storage API.
 */
export type Bucket = {
  /** Bucket name. */
  name: BucketName

  /** Project that owns the bucket. */
  project_id: ProjectId

  /** Whether objects in this bucket are publicly accessible. */
  public: boolean

  /** Physical or logical storage location for bucket data. */
  location: StorageLocation

  /**
   * MIME types accepted by this bucket.
   *
   * An empty array means the bucket does not restrict uploads by MIME type.
   */
  allowed_mime_types: string[]

  /**
   * Maximum direct object upload size in bytes.
   *
   * `0` means there is no bucket-specific limit. Platform-wide upload limits may still apply.
   */
  file_size_limit: ByteLength

  /** Whether uploading an existing object key is allowed to replace the object. */
  allow_overwrite: boolean

  /** Default signed URL expiry in seconds for this bucket. */
  signed_url_expiry_seconds: number

  /** User-defined bucket metadata. */
  attributes: StorageAttributes

  /** Timestamp when the bucket was created. */
  created_at: IsoTimestamp

  /** Timestamp when the bucket was last updated. */
  updated_at: IsoTimestamp
}

/**
 * Backwards-compatible name for a bucket record.
 */
export type StorageBucketInfo = Bucket

/**
 * Options used to construct a standalone Storage client.
 */
export type StorageClientOptions = {
  /** Custom fetch implementation for non-standard runtimes or instrumentation. */
  fetch?: Fetch | undefined

  /** Additional headers sent with every Storage API request. */
  headers?: HeadersInit | undefined

  /** Project identifier sent as the `X-Jupiter-Project-Id` header. */
  projectId: string

  /** Number of attempts for retryable requests. Defaults to one attempt. */
  retryAttempts?: number | undefined

  /** Request timeout in milliseconds. */
  timeoutMs?: number | undefined

  /** Bearer token sent as the `Authorization` header. */
  token?: string | undefined
}

/**
 * Request body for creating a bucket.
 */
export type CreateBucketRequest = {
  /** Bucket name. */
  name: BucketName

  /** Storage location for the bucket. */
  location: StorageLocation

  /** Whether objects in this bucket are publicly accessible. Defaults to `false`. */
  public?: boolean

  /**
   * MIME types accepted by this bucket.
   *
   * An empty array means the bucket does not restrict uploads by MIME type.
   */
  allowed_mime_types?: string[]

  /**
   * Maximum direct object upload size in bytes.
   *
   * `0` means there is no bucket-specific limit.
   */
  file_size_limit?: ByteLength

  /** Whether uploading an existing object key is allowed to replace the object. */
  allow_overwrite?: boolean

  /** Default signed URL expiry in seconds for this bucket. */
  signed_url_expiry_seconds?: number

  /** User-defined bucket metadata. */
  attributes?: StorageAttributes
}

/**
 * Ergonomic SDK options for creating a bucket.
 *
 * The SDK maps these camelCase fields to the Storage API request body.
 */
export type CreateBucketOptions = {
  /** Bucket name. */
  name: BucketName

  /** Whether uploading an existing object key is allowed to replace the object. */
  allowOverwrite?: boolean

  /** MIME types accepted by this bucket. */
  allowedMimeTypes?: string[]

  /** User-defined bucket metadata. */
  attributes?: StorageAttributes

  /** Maximum direct object upload size in bytes. */
  fileSizeLimit?: ByteLength

  /** Storage location for the bucket. */
  location: StorageLocation

  /** Whether objects in this bucket are publicly accessible. */
  public?: boolean

  /** Default signed URL expiry in seconds for this bucket. */
  signedUrlExpirySeconds?: number
}

/**
 * Request body for updating a bucket.
 */
export type UpdateBucketRequest = Partial<Omit<CreateBucketRequest, 'name' | 'location'>>

/**
 * Ergonomic SDK options for updating a bucket.
 */
export type UpdateBucketOptions = Partial<Omit<CreateBucketOptions, 'location'>>

/**
 * Request body for deleting a bucket.
 */
export type DeleteBucketRequest =
  | {
      /** Delete active objects and multipart uploads before deleting the bucket. */
      force_flush?: boolean
    }
  | boolean

/**
 * Response returned when listing buckets.
 */
export type ListBucketsResponse = {
  /** Buckets in the project. */
  buckets: Bucket[]

  /** Number of buckets in the response. */
  count: number
}

/**
 * Response returned after deleting a bucket.
 */
export type DeleteBucketResponse = {
  /** Deleted bucket name. */
  bucketName: BucketName

  /** Whether the bucket was deleted. */
  deleted: boolean
}

/**
 * Response returned after flushing a bucket.
 */
export type FlushBucketResponse = {
  /** Flushed bucket name. */
  bucketName: BucketName

  /** Whether the bucket was flushed. */
  flushed: boolean

  /** Number of active object keys removed. */
  flushedKeys: number

  /** Number of active multipart uploads removed. */
  flushedMultipartUploads: number
}

/**
 * Response returned when counting objects in a bucket.
 */
export type CountObjectsResponse = {
  /** Bucket that was counted. */
  bucketName: BucketName

  /** Number of objects in the bucket. */
  count: number
}

/**
 * Options for listing objects in a bucket.
 */
export type ListObjectsOptions = {
  /** Optional object key prefix filter. */
  prefix?: string

  /** Cursor returned from the previous page. */
  cursor?: Cursor

  /** Page size. Values are clamped by the API to `1` through `1000`. */
  limit?: PageLimit
}

/**
 * Upload body accepted by direct object uploads.
 *
 * `FormData` is intentionally excluded because the exact multipart byte length and
 * boundary are runtime-controlled. Use `Blob`, `File`, `ArrayBuffer`, typed arrays,
 * strings, `URLSearchParams`, or `ReadableStream` instead.
 */
export type UploadBody = Exclude<BodyInit, FormData>

/**
 * Options for uploading object bytes directly.
 */
export type UploadObjectOptions = {
  /** Cache-Control value stored with the object. */
  cacheControl?: string

  /**
   * Size of the object body in bytes.
   *
   * Use `0` for empty objects or folder markers.
   */
  contentLength?: ByteLength

  /** MIME type for the uploaded object. Defaults to `application/octet-stream`. */
  contentType?: string

  /** User-defined object metadata encoded into the `X-Jupiter-Object-Metadata` header. */
  metadata?: StorageAttributes

  /** Abort signal for cancelling the upload request. */
  signal?: AbortSignal
}

/**
 * Options for downloading object bytes.
 */
export type DownloadObjectOptions = {
  /** Abort signal for cancelling the download request. */
  signal?: AbortSignal
}

/**
 * Request body for updating object attributes.
 */
export type PatchObjectRequest = {
  /** Replacement user-defined attributes for the object. */
  attributes: StorageAttributes
}

/**
 * Options for updating object attributes.
 */
export type UpdateObjectOptions = {
  /** Replacement user-defined attributes for the object. */
  attributes: StorageAttributes

  /** Abort signal for cancelling the update request. */
  signal?: AbortSignal
}

/**
 * Request body for copying an object to a destination path.
 */
export type CopyObjectRequest = {
  /** Source bucket name. Use the destination bucket name for same-bucket copies. */
  originBucket: BucketName

  /** Source object key. */
  originKey: ObjectKey

  /** Optional content type override for the copied object. */
  contentType?: string

  /** Optional Cache-Control override for the copied object. */
  cacheControl?: string

  /** Optional metadata override for the copied object. */
  objectMetadata?: StorageAttributes
}

/**
 * Options for copying an object.
 *
 * The destination bucket and key are usually expressed by the method path, while these
 * options identify the source object and optional metadata overrides.
 */
export type CopyObjectOptions = {
  /** Source bucket name. Use the destination bucket name for same-bucket copies. */
  originBucket: BucketName

  /** Source object key. */
  originKey: ObjectKey

  /** Optional content type override for the copied object. */
  contentType?: string

  /** Optional Cache-Control override for the copied object. */
  cacheControl?: string

  /** Optional metadata override for the copied object. */
  metadata?: StorageAttributes

  /** Abort signal for cancelling the copy request. */
  signal?: AbortSignal
}

/**
 * Response returned after copying an object.
 */
export type CopyObjectResponse = {
  /** Whether the copy completed. */
  success: boolean

  /** Destination bucket name. */
  destinationBucketName: BucketName

  /** Destination object key. */
  destinationKey: ObjectKey

  /** Entity tag assigned to the copied object. */
  etag: ETag
}

/**
 * Options for deleting multiple objects.
 */
export type DeleteObjectsOptions = {
  /** Object keys to delete. The API accepts 1 through 1000 keys. */
  keys: [ObjectKey, ...ObjectKey[]]

  /** Abort signal for cancelling the delete request. */
  signal?: AbortSignal
}

/**
 * Request body for deleting multiple objects.
 *
 * The API accepts 1 through 1000 object keys.
 */
export type BulkDeleteObjectsRequest = [ObjectKey, ...ObjectKey[]]

/**
 * Response returned after deleting multiple objects.
 */
export type BulkDeleteObjectsResponse = {
  /** Object keys that were deleted. */
  deleted: ObjectKey[]

  /** Number of deleted objects. */
  count: number
}

/**
 * Object metadata record returned by the Storage API.
 */
export type StorageObject = {
  /** Object key inside the bucket. */
  key: ObjectKey

  /** Bucket that contains the object. */
  bucket_name: BucketName

  /** MIME type stored with the object. */
  content_type: string

  /** Object size in bytes. */
  content_length: ByteLength

  /**
   * An entity tag (ETag) is an opaque identifier assigned by the storage service
   * to this specific object version.
   */
  etag: ETag

  /** Cache-Control value stored with the object. */
  cache_control: string

  /** User-defined object metadata. */
  attributes: StorageAttributes

  /** Timestamp when the object was created. */
  created_at: IsoTimestamp

  /** Timestamp when the object was last updated. */
  updated_at: IsoTimestamp
}

/**
 * Response returned after uploading object bytes.
 */
export type UploadObjectResponse = {
  /** Uploaded object metadata. */
  object: StorageObject

  /** Whether the object bytes were uploaded. */
  uploaded: boolean
}

/**
 * Response returned after updating object attributes.
 */
export type UpdateObjectAttributesResponse = {
  /** Updated object metadata. */
  object_data: StorageObject
}

/**
 * Response returned when listing objects.
 */
export type ListObjectsResponse = {
  /** Objects in the current page. */
  objects: StorageObject[]

  /** Cursor for the next page, or `null` when no next page exists. */
  nextCursor: Cursor | null

  /** Whether the result was truncated and another page is available. */
  isTruncated: boolean

  /** Number of objects in the current page. */
  count: number
}

/**
 * Backwards-compatible name for paginated object results.
 */
export type PaginatedStorageObjects = {
  /** Cursor for the next page, or `null` when no next page exists. */
  nextCursor: Cursor | null

  /** Whether the result was truncated and another page is available. */
  isTruncated: boolean

  /** Number of objects in the current page. */
  count: number

  /** Objects in the current page. */
  objects: StorageObject[]
}

/**
 * Response returned after deleting one object.
 */
export type DeleteObjectResponse = {
  /** Deleted object key. */
  key: ObjectKey

  /** Whether the object was deleted. */
  deleted: boolean
}

/**
 * Headers returned when downloading object bytes.
 */
export type DownloadObjectHeaders = {
  /** MIME type of the downloaded object. */
  contentType?: string

  /** Size of the downloaded object in bytes. */
  contentLength?: ByteLength

  /**
   * An entity tag (ETag) is an opaque identifier assigned by the storage service
   * to this specific object version.
   */
  etag?: ETag

  /** Cache-Control value stored with the object. */
  cacheControl?: string

  /** User-defined object metadata decoded from the response header. */
  metadata?: StorageAttributes

  /** Timestamp when the object was created. */
  createdAt?: IsoTimestamp

  /** Timestamp when the object was last updated. */
  updatedAt?: IsoTimestamp
}

/**
 * Response returned after downloading object bytes.
 */
export type DownloadObjectResponse = {
  /** Downloaded object bytes. */
  body: Blob

  /** Metadata returned in object download response headers. */
  headers: DownloadObjectHeaders
}

/**
 * Multipart upload record returned by the Storage API.
 */
export type MultipartUpload = {
  /** Multipart upload identifier. */
  upload_id: UploadId

  /** Final object key for the upload. */
  key: ObjectKey

  /** Project that owns the upload. */
  project_id: ProjectId

  /** Bucket that contains the upload. */
  bucket_name: BucketName

  /** MIME type that will be stored on the completed object. */
  content_type: string

  /** Cache-Control value that will be stored on the completed object. */
  cache_control: string

  /** User-defined metadata that will be stored on the completed object. */
  attributes: StorageAttributes

  /** Timestamp when the multipart upload was created. */
  created_at: IsoTimestamp

  /** Timestamp when the multipart upload was last updated. */
  updated_at: IsoTimestamp
}

/**
 * Multipart upload part metadata returned by the Storage API.
 */
export type MultipartUploadPart = {
  /** Multipart upload identifier. */
  upload_id: UploadId

  /** Final object key for the upload. */
  key: ObjectKey

  /** Project that owns the upload. */
  project_id: ProjectId

  /** Bucket that contains the upload. */
  bucket_name: BucketName

  /** Part number in the range `1` through `10000`. */
  part_number: PartNumber

  /** Size of this part in bytes. */
  part_size: ByteLength

  /**
   * An entity tag (ETag) is an opaque identifier assigned by the storage service
   * to this specific multipart part.
   */
  etag: ETag

  /** Timestamp when the part was created. */
  created_at: IsoTimestamp

  /** Timestamp when the part was last updated. */
  updated_at: IsoTimestamp
}

/**
 * Options for listing active multipart uploads.
 */
export type ListMultipartUploadsOptions = {
  /** Cursor returned from the previous page. */
  cursor?: Cursor

  /** Page size. Values are clamped by the API to `1` through `1000`. */
  limit?: PageLimit
}

/**
 * Options for starting a multipart upload.
 */
export type StartMultipartUploadOptions = {
  /** Final object key for the multipart upload. */
  key: ObjectKey

  /** MIME type for the completed object. Defaults to `application/octet-stream`. */
  contentType?: string

  /** Cache-Control value to store with the completed object. */
  cacheControl?: string

  /** User-defined object metadata encoded into the `X-Jupiter-Object-Metadata` header. */
  metadata?: StorageAttributes

  /** Abort signal for cancelling the start request. */
  signal?: AbortSignal
}

/**
 * Response returned after starting a multipart upload.
 */
export type MultipartStartResponse = {
  /** Multipart upload identifier. */
  upload_id: UploadId

  /** Final object key for the multipart upload. */
  key: ObjectKey

  /** Bucket that contains the upload. */
  bucket: BucketName
}

/**
 * Response returned when listing active multipart uploads.
 */
export type ListMultipartUploadsResponse = {
  /** Uploads in the current page. */
  uploads: MultipartUpload[]

  /** Cursor for the next page, or `null` when no next page exists. */
  nextCursor: Cursor | null

  /** Whether the result was truncated and another page is available. */
  isTruncated: boolean

  /** Number of uploads in the current page. */
  count: number

  /** Bucket that was listed. */
  bucketName: BucketName
}

/**
 * Options for uploading raw bytes for a multipart part.
 */
export type UploadMultipartPartOptions = {
  /** Part number in the range `1` through `10000`. */
  partNumber: PartNumber

  /** Size of the request body in bytes. */
  contentLength: ByteLength

  /** Abort signal for cancelling the upload request. */
  signal?: AbortSignal
}

/**
 * Options for copying an existing object as a multipart part.
 */
export type CopyMultipartPartOptions = {
  /** Source object key. */
  key: ObjectKey

  /** Part number in the range `1` through `10000`. */
  partNumber: PartNumber

  /** Abort signal for cancelling the copy request. */
  signal?: AbortSignal
}

/**
 * Response returned after uploading or copying a multipart part.
 */
export type MultipartPartUploadResponse = {
  /**
   * An entity tag (ETag) is an opaque identifier assigned by the storage service
   * to this specific multipart part.
   */
  etag: ETag

  /** Uploaded part number. */
  part_number: PartNumber

  /** Uploaded part size in bytes. */
  part_size: ByteLength
}

/**
 * Options for listing multipart upload parts.
 */
export type ListMultipartPartsOptions = {
  /** Part number cursor returned from the previous page. */
  cursor?: PartNumber

  /** Page size. Values are clamped by the API to `1` through `1000`. */
  limit?: PageLimit
}

/**
 * Response returned when listing multipart upload parts.
 */
export type ListMultipartPartsResponse = {
  /** Parts in the current page. */
  parts: MultipartUploadPart[]

  /** Cursor for the next page, or `null` when no next page exists. */
  nextCursor: PartNumber | null

  /** Whether the result was truncated and another page is available. */
  isTruncated: boolean

  /** Number of parts in the current page. */
  count: number

  /** Multipart upload identifier. */
  uploadId: UploadId

  /** Final object key for the upload. */
  key: ObjectKey

  /** Bucket that contains the upload. */
  bucketName: BucketName
}

/**
 * Response returned when loading a multipart upload and its parts.
 */
export type GetMultipartUploadResponse = ListMultipartPartsResponse & {
  /** Multipart upload metadata. */
  upload: MultipartUpload
}

/**
 * Response returned when loading one multipart upload part.
 */
export type GetMultipartPartResponse = {
  /** Multipart upload identifier. */
  upload_id: UploadId

  /** Final object key for the upload. */
  key: ObjectKey

  /** Bucket that contains the upload. */
  bucketName: BucketName

  /** Multipart part metadata. */
  part: MultipartUploadPart
}

/**
 * Part selector used when completing a multipart upload.
 */
export type CompleteMultipartUploadPart = {
  /** Part number in the range `1` through `10000`. */
  part_number: PartNumber
}

/**
 * Request body for completing a multipart upload.
 *
 * Omit `parts` to complete with all uploaded parts.
 */
export type CompleteMultipartUploadRequest = {
  /** Optional subset of uploaded parts to complete. */
  parts?: CompleteMultipartUploadPart[]
}

/**
 * Ergonomic SDK options for completing a multipart upload.
 */
export type CompleteMultipartUploadOptions = {
  /** Optional subset of uploaded part numbers to complete. */
  partNumbers?: PartNumber[]

  /** Abort signal for cancelling the complete request. */
  signal?: AbortSignal
}

/**
 * Response returned after completing a multipart upload.
 */
export type CompleteMultipartUploadResponse = {
  /** Object metadata for the completed upload. */
  object_data: StorageObject

  /** Whether the final object was uploaded. */
  uploaded: boolean
}

/**
 * Response returned after aborting a multipart upload.
 */
export type AbortMultipartUploadResponse = {
  /** Whether the upload was aborted. */
  aborted: boolean
}

/**
 * Standard result type returned by Storage SDK methods.
 */
export type StorageResult<TData> = Promise<JupiterResult<TData, StorageError>>
