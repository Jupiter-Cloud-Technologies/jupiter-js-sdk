import { JUPITER_PROJECT_ID_HEADER } from '@jupiter-cloud/core'

type Fetch = typeof fetch

export const resolveFetch = (customFetch?: Fetch): Fetch => {
  if (customFetch) {
    return (...args: Parameters<Fetch>) => customFetch(...args)
  }
  return (...args: Parameters<Fetch>) => fetch(...args)
}

export const resolveHeadersConstructor = () => {
  return Headers
}

export const fetchWithAuth = (
  projectid: string,
  getAccessToken: () => Promise<string | null>,
  customFetch?: Fetch,
  adminToken?: string
): Fetch => {
  const fetch = resolveFetch(customFetch)
  const HeadersConstructor = resolveHeadersConstructor()

  return async (input, init) => {
    const accessToken = await getAccessToken()
    const headers = new HeadersConstructor(init?.headers)

    if (!headers.has(JUPITER_PROJECT_ID_HEADER)) {
      headers.set('x-jupiter-project-id', projectid)
    }

    if (!headers.has('Authorization') && adminToken) {
      headers.set('Authorization', `Bearer ${adminToken}`)
    }

    if (!headers.has('Authorization') && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    return fetch(input, { ...init, headers })
  }
}
