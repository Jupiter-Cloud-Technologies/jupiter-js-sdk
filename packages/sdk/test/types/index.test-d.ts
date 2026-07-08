import { expectAssignable, expectType } from 'tsd'
import { Jupiter } from '../..'

const client = new Jupiter('https://api.example.test', '00000000-0000-4000-8000-000000000001')

expectType<Jupiter>(client)
expectAssignable<Promise<unknown>>(
  client.auth.signInWithEmailAndPassword({ email: 'a@b.com', password: 'p' })
)
expectAssignable<Promise<unknown>>(
  client.storage.createBucket({
    location: 'weur',
    name: 'avatars'
  })
)
