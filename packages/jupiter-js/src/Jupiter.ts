import { JupiterClient } from './JupiterClient'
import type { JupiterClientOptions } from './types'

export function Jupiter(baseUrl: string, options: JupiterClientOptions): JupiterClient {
  return new JupiterClient(baseUrl, options)
}
