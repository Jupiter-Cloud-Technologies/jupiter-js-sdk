# Jupiter Cloud JavaScript SDK

## Install

```sh
npm i @jupiter-cloud/sdk
```

## Usage

```ts
import { Jupiter } from '@jupiter-cloud/sdk'

const jupiter = new Jupiter('https://api.jupitercloud.co', '550e8400-e29b-41d4-a716-446655440001')

const result = await jupiter.storage.listBuckets()

const result = await jupiter.auth.signInWithEmailAndPassword({
  email: 'user@example.com',
  password: 'password1'
})
```
