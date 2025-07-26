import { createDrizzleClient } from '@slide.code/schema'
import { type RemoteCallback } from 'drizzle-orm/sqlite-proxy'
import { createSlideRpcClient, rpcLayers, ensureConnection } from '../rpc/impl.js'
import { Effect, pipe } from 'effect'

const dbCallback: RemoteCallback = async (sql, params, method) => {
  try {
    // Ensure connection is established
    await ensureConnection()

    // Run the RPC program to execute the query
    const result = await Effect.runPromise(
      pipe(
        createSlideRpcClient,
        Effect.flatMap((client) => client.ExecuteQuery({ sql, params, method })),
        Effect.provide(rpcLayers),
        Effect.scoped
      )
    )

    return { rows: result.rows as any[] }
  } catch (error) {
    // TODO: Log error with proper logger
    console.error('Database error:', error)
    throw error
  }
}

export const db = createDrizzleClient(dbCallback)
