# Jupiter JavaScript SDK

JavaScript and TypeScript SDKs for Jupiter Cloud.

## Packages

- `@jupiter-cloud/core`: shared runtime, HTTP, errors, and utility types.
- `@jupiter-cloud/storage`: standalone Storage SDK.
- auth
- db-rest
- `@jupiter-cloud/jupiter-js`: aggregate SDK that composes product SDKs.

## Install

```sh
pnpm add @jupiter-cloud/jupiter-js
```

## Usage

```ts
import { Jupiter } from '@jupiter-cloud/jupiter-js'

const jupiter = new Jupiter('https://api.jupiter.example', {
  projectId: 'project-id',
  token: 'public-or-user-token'
})

const { data, error } = await jupiter.storage.from('avatars').list()
```

Use a standalone product package when you only need one service:

```ts
import { JupiterStorage } from '@jupiter-cloud/storage'

const storage = new JupiterStorage('https://storage.jupiter.example', {
  projectId: 'project-id',
  token: 'service-or-user-token'
})
```
