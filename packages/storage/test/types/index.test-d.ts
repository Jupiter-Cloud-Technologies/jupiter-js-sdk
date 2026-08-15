import { expectError, expectType } from 'tsd'
import { JupiterStorage, type DownloadObjectResponse } from '../..'

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

storage.uploadObject({
  attributes: {
    owner: 'user-1'
  },
  body: 'content',
  bucketName: 'forms',
  key: 'plain'
})

expectError(
  storage.uploadObject({
    body: 'content',
    bucketName: 'forms',
    key: 'plain',
    metadata: {
      owner: 'user-1'
    }
  })
)

storage.copyObject({
  attributes: {
    owner: 'user-1'
  },
  destinationBucketName: 'backup',
  destinationKey: 'plain',
  originBucket: 'forms',
  originKey: 'plain'
})

expectError(
  storage.copyObject({
    destinationBucketName: 'backup',
    destinationKey: 'plain',
    metadata: {
      owner: 'user-1'
    },
    originBucket: 'forms',
    originKey: 'plain'
  })
)

storage.startMultipartUpload({
  attributes: {
    owner: 'user-1'
  },
  bucketName: 'forms',
  key: 'plain'
})

expectError(
  storage.startMultipartUpload({
    bucketName: 'forms',
    key: 'plain',
    metadata: {
      owner: 'user-1'
    }
  })
)

declare const download: DownloadObjectResponse

expectType<DownloadObjectResponse['headers']['attributes']>(download.headers.attributes)
expectError(download.headers.metadata)
