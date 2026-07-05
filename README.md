# Jupiter JavaScript SDK

JavaScript and TypeScript SDKs for Jupiter Cloud.

## Packages

- `@jupiter-cloud/core`: shared runtime, HTTP, errors, and utility types.
- `@jupiter-cloud/auth`: standalone Auth SDK.
- `@jupiter-cloud/storage`: standalone Storage SDK.
- db-rest
- `@jupiter-cloud/sdk`: aggregate SDK that composes product SDKs.

## Install

```sh
pnpm add @jupiter-cloud/sdk
```

## Usage

```ts
import { Jupiter } from '@jupiter-cloud/sdk'

const jupiter = new Jupiter({
  baseUrl: 'https://api.jupiter.example',
  projectId: 'project-id',
  token: 'public-or-user-token',
  timeoutMs: 10_000,
  fetch
})

const { data, error } = await jupiter.storage.listBuckets()
const { data: session } = await jupiter.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password1'
})
```

Use a standalone product package when you only need one service:

```ts
import { JupiterStorage } from '@jupiter-cloud/storage'

const storage = new JupiterStorage('https://storage.jupiter.example', {
  projectId: 'project-id',
  token: 'service-or-user-token'
})
```
