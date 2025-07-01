import { createClient, type Client } from '@libsql/client/node'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from '@slide.code/schema'

const clientLogger = console.log

/**
 * Error class for database client errors
 */
export class DatabaseClientError extends Error {
  readonly _tag = 'DatabaseClientError'

  constructor(message: string) {
    super(message)
    this.name = 'DatabaseClientError'
  }
}

/**
 * Create a database client with the given path
 */
export const createDatabase = (dbPath: string) => {
  try {
    // Create the Turso client
    const tursoClient: Client = createClient({
      url: `file:${dbPath}.db`
    })

    // Create the Drizzle ORM instance
    const db = drizzle(tursoClient, { schema: schema.schema })

    return {
      tursoClient,
      db
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new DatabaseClientError(`Failed to create database client: ${errorMessage}`)
  }
}

// Export types
export type Database = typeof schema
