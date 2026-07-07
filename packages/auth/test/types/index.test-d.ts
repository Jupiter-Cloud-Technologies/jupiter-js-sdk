import { expectType } from 'tsd'
import { JupiterAuth, type AuthResponse, type AuthTokenResponsePassword } from '../..'

const auth = new JupiterAuth('https://auth.example.test', {
  projectId: 'project-1'
})

expectType<JupiterAuth>(auth)
expectType<Promise<AuthTokenResponsePassword>>(
  auth.signInWithEmailAndPassword({
    email: 'user@example.com',
    password: 'password1'
  })
)
expectType<Promise<AuthResponse>>(
  auth.signUpWithEmailAndPassword({
    email: 'user@example.com',
    password: 'password1'
  })
)
expectType<string>(
  auth.getAuthorizeUrl({
    provider: 'github'
  })
)
