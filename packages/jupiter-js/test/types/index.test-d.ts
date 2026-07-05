import { expectAssignable, expectType } from 'tsd'
import { Jupiter, JupiterClient } from '../..'

const client = Jupiter('https://api.example.test', {
  projectId: 'project-1'
})

expectType<JupiterClient>(client)
expectAssignable<Promise<unknown>>(
  client.storage.createBucket({
    location: 'weur',
    name: 'avatars'
  })
)
