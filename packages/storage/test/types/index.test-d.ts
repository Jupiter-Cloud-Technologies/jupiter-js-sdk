import { expectError } from 'tsd'
import { StorageClient } from '../..'

const storage = new StorageClient('https://storage.example.test', {
  projectId: 'project-1'
})

expectError(storage.uploadObject('forms', 'multipart', new FormData()))
expectError(
  storage.uploadMultipartPart('forms', 'upload-1', new FormData(), {
    contentLength: 1,
    partNumber: 1
  })
)
