type CapturedRequest = {
  headers: Headers
  url: string
}

export function createFetch(requests: CapturedRequest[]): typeof fetch {
  return (input, init) => {
    requests.push({
      headers: new Headers(init?.headers),
      url: toRequestUrl(input)
    })

    return Promise.resolve(
      Response.json({
        buckets: [],
        count: 0
      })
    )
  }
}

function toRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}
