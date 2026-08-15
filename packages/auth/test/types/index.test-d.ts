import { expectError, expectType } from 'tsd'
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
expectType<Promise<AuthResponse>>(
  auth.signUpWithPhoneAndPassword({
    phone: '+15555550100',
    password: 'password1'
  })
)
expectError(
  auth.signUpWithPhoneAndPassword({
    email: 'user@example.com',
    password: 'password1'
  })
)
expectType<Promise<AuthTokenResponsePassword>>(
  auth.signInWithPhoneAndPassword({
    phone: '+15555550100',
    password: 'password1'
  })
)
expectError(
  auth.signInWithPhoneAndPassword({
    email: 'user@example.com',
    password: 'password1'
  })
)
expectType<string>(
  auth.getAuthorizeUrl({
    provider: 'github'
  })
)
