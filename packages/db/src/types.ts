import type { drizzle } from 'drizzle-orm/libsql'
import type { schema } from '@slide.code/schema'

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export interface DatabaseConfig {
  dataDir?: string
  inMemory?: boolean
}

export interface DatabaseClient {
  db: DrizzleDB
  close: () => Promise<void>
}
export interface QueryResult<T> {
  data: T
  error: Error | null
}

// queries/types.ts
export interface BaseQuery<TParams, TResult> {
  name: string
  execute: (params: TParams) => Promise<QueryResult<TResult>>
}

export interface QueryDefinition<TParams = void, TResult = unknown> {
  name: string
  execute: (db: DrizzleDB, params: TParams) => Promise<TResult>
}
