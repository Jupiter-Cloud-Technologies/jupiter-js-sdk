import { expectAssignable, expectType } from 'tsd'

import {
  HttpClient,
  JUPITER_PROJECT_ID_HEADER,
  VERSION,
  createHeaders,
  type JupiterResult
} from '../..'

expectType<'X-Jupiter-Project-Id'>(JUPITER_PROJECT_ID_HEADER)
expectAssignable<string>(VERSION)
expectType<Headers>(createHeaders())
expectAssignable<Promise<JupiterResult<unknown>>>(
  new HttpClient('https://api.example.test').request<unknown>('/health')
)
