import { expectAssignable, expectType } from 'tsd'
import { Jupiter } from '../..'

const client = new Jupiter(
  'https://api.example.test',
  '00000000-0000-4000-8000-000000000001',
  'admin-token'
)
const clientWithoutAdminToken = new Jupiter(
  'https://api.example.test',
  '00000000-0000-4000-8000-000000000001'
)
const clientWithOptions = new Jupiter(
  'https://api.example.test',
  '00000000-0000-4000-8000-000000000001',
  {
    global: {
      fetch
    }
  }
)

expectType<Jupiter>(client)
expectType<Jupiter>(clientWithoutAdminToken)
expectType<Jupiter>(clientWithOptions)
expectAssignable<Promise<unknown>>(
  client.auth.signInWithEmailAndPassword({ email: 'a@b.com', password: 'p' })
)
expectAssignable<Promise<unknown>>(
  client.storage.createBucket({
    location: 'weur',
    name: 'avatars'
  })
)
