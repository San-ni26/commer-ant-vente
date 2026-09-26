// lib/offline/idb-stub.ts
// Server-side stub for the `idb` package.
// The real `idb` module uses browser-only IndexedDB APIs that cannot run
// on the server. Turbopack resolves this file instead of `idb` on the
// server bundle, preventing "enqueueModel is not a function" RSC errors.

export function openDB(): never {
  throw new Error('[idb-stub] openDB() must only be called in the browser.')
}

export type { IDBPDatabase } from 'idb'
