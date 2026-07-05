export type Fetch = typeof fetch

export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export type JsonObject = {
  [key: string]: JsonValue | undefined
}

export type HeadersInitLike = Record<string, string | undefined>

export type JupiterClientErrorCode =
  | 'jupiter.abort_error'
  | 'jupiter.http_error'
  | 'jupiter.invalid_response'
  | 'jupiter.network_error'
  | 'jupiter.timeout_error'

export type JupiterErrorPayload<TCode extends string = string> = {
  code: TCode
  detail: string
  requestId?: string | undefined
  status: number
  title: string
  type: string
}

export type JupiterClientErrorPayload = JupiterErrorPayload<JupiterClientErrorCode>

export type JupiterResult<TData, TError extends JupiterErrorPayload = JupiterErrorPayload> =
  | {
      data: TData
      error: null
      response: Response
    }
  | {
      data: null
      error: TError | JupiterClientErrorPayload
      response: Response
    }
