import { describe, expect, it } from 'vitest'
import { STORAGE_ERROR_CODES, STORAGE_LOCATIONS } from '../src/types'

describe('storage types', () => {
  it('exports supported storage locations', () => {
    expect(STORAGE_LOCATIONS).toEqual(['apac', 'eeur', 'enam', 'oc', 'weur', 'wnam'])
  })

  it('exports storage problem detail codes from the OpenAPI contract', () => {
    expect(STORAGE_ERROR_CODES).toEqual([
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
    ])
  })
})
