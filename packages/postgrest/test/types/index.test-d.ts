import { expectAssignable, expectType } from 'tsd'
import { JupiterPostgrest, type PostgrestResult } from '../..'

type Todo = {
  id: number
  name: string
}

const postgrest = new JupiterPostgrest('https://api.example.test/rest', {
  projectId: 'project-1'
})

expectType<PostgrestResult<Todo[]>>(postgrest.select<Todo>('todos'))
expectType<PostgrestResult<Todo[]>>(postgrest.insert<Todo>('todos', { name: 'ship' }))
expectType<PostgrestResult<Todo[]>>(postgrest.update<Todo>('todos', { name: 'ship' }))
expectType<PostgrestResult<Todo[]>>(postgrest.upsert<Todo>('todos', [{ name: 'ship' }]))
expectType<PostgrestResult<Todo[]>>(postgrest.delete<Todo>('todos'))

expectAssignable<Promise<unknown>>(postgrest.request<unknown>('/todos'))
