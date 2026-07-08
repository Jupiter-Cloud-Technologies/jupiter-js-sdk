import { expectAssignable, expectType } from 'tsd'

import {
  NeonPostgrestClient,
  type DefaultSchemaName,
  type NeonPostgrestClientConstructorOptions
} from '../..'

type Database = {
  public: {
    Tables: {
      todos: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

expectType<'public'>('public' as DefaultSchemaName<Database>)

expectAssignable<NeonPostgrestClientConstructorOptions<'public'>>({
  dataApiUrl: 'https://api.example.test/rest',
  options: {
    db: {
      schema: 'public'
    },
    global: {
      fetch,
      headers: {
        authorization: 'Bearer token'
      }
    }
  }
})

const postgrest = new NeonPostgrestClient<Database>({
  dataApiUrl: 'https://api.example.test/rest',
  options: {
    db: {
      schema: 'public'
    }
  }
})

expectAssignable<NeonPostgrestClient<Database>>(postgrest)
expectAssignable<PromiseLike<unknown>>(postgrest.from('todos').select())
