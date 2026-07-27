import { expectError } from 'tsd'
import { JupiterStorage } from '../..'

const storage = new JupiterStorage('https://storage.example.test', {
  projectId: 'project-1'
})

expectError(
  storage.uploadObject({
    body: new FormData(),
    bucketName: 'forms',
    key: 'multipart'
  })
)
expectError(
  storage.uploadMultipartPart({
    body: new FormData(),
    bucketName: 'forms',
    contentLength: 1,
    partNumber: 1,
    uploadId: 'upload-1'
  })
)
