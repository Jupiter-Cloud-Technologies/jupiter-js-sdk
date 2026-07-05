import { expectAssignable, expectType } from 'tsd'
import { Jupiter } from '../..'

const client = new Jupiter({
  baseUrl: 'https://api.example.test',
  projectId: 'project-1'
})

expectType<Jupiter>(client)
expectAssignable<Promise<unknown>>(
  client.storage.createBucket({
    location: 'weur',
    name: 'avatars'
  })
)
