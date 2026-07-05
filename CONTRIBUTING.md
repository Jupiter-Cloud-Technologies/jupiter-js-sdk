# Contributing

This repository uses pnpm workspaces and Turborepo.

## Setup

```sh
pnpm install
pnpm build
pnpm test
```

## Package Boundaries

Product areas live in their own packages under `packages/*`.

- `packages/core`: shared runtime, HTTP, errors, and utility types.
- `packages/storage`: standalone storage client.
- `packages/jupiter-js`: aggregate client that composes service packages.

Do not place product implementations inside the aggregate package. The aggregate package should compose public clients.

## Releases

Use Changesets for versioned changes:

```sh
pnpm changeset
```
