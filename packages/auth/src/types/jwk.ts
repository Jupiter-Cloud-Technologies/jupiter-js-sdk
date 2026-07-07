export interface JWK {
  kty: 'RSA' | 'EC' | 'oct' | (string & {})
  key_ops: string[]
  alg?: string
  kid?: string
  [key: string]: any
}
