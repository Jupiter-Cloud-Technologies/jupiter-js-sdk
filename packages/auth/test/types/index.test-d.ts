import { expectAssignable, expectType } from 'tsd'
import { JupiterAuth, type AccessTokenResponse, type AuthResult } from '../..'

const auth = new JupiterAuth('https://auth.example.test', {
  projectId: 'project-1'
})

expectType<JupiterAuth>(auth)
expectType<AuthResult<AccessTokenResponse>>(
  auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password1'
  })
)
expectAssignable<Promise<unknown>>(
  auth.signUp({
    codeChallengeMethod: 's256',
    email: 'user@example.com',
    password: 'password1'
  })
)
expectType<string>(
  auth.getAuthorizeUrl({
    provider: 'github'
  })
)
