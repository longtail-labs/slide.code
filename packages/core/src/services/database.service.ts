import { Effect, Schema } from 'effect'
import { createDatabase } from '@slide.code/db'
import * as schema from '@slide.code/schema'
import { eq, and, asc, desc, isNotNull } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { Client } from '@libsql/client/node'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { getDrizzleFolder } from '@slide.code/shared'
import type {
  Project,
  Task,
  ChatMessage,
  ProjectInsert,
  TaskInsert,
  ChatMessageInsert
} from '@slide.code/schema'
import { randomUUID } from 'crypto'

const dbLogger = console.log

/**
 * Schema for Database configuration
 */
export const DatabaseConfigSchema = Schema.Struct({
  dataDir: Schema.String,
  migrationsDir: Schema.optionalWith(Schema.String, { exact: true }),
  inMemory: Schema.optionalWith(Schema.Boolean, { exact: true, default: () => false })
})

export type DatabaseConfig = Schema.Schema.Type<typeof DatabaseConfigSchema>

/**
 * Errors that can be thrown by the Database service
 */
export class DatabaseServiceError extends Error {
  readonly _tag = 'DatabaseServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'DatabaseServiceError'
  }
}

/**
 * DatabaseService for managing database operations
 */
export class DatabaseService extends Effect.Service<DatabaseService>()('DatabaseService', {
  dependencies: [],
  effect: Effect.gen(function* () {
    let initialized = false
    let _db: LibSQLDatabase<typeof schema.schema>
    let _tursoClient: Client
    let dataDir: string
    let migrationsDir: string

    /**
     * Initialize the database with configuration
     */
    const initialize = (config: DatabaseConfig) =>
      Effect.try({
        try: () => {
          dbLogger('Initializing database service with dataDir:', config.dataDir)
          dataDir = config.dataDir
          migrationsDir = config.migrationsDir || getDrizzleFolder()

          // Initialize database client
          const { db, tursoClient } = createDatabase(dataDir)
          _db = db
          _tursoClient = tursoClient

          initialized = true
          return true
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to initialize database service:', errorMessage)
          return new DatabaseServiceError(`Failed to initialize database: ${errorMessage}`)
        }
      })

    /**
     * Initialize the database with configuration and run migrations
     */
    const initAndMigrate = (config: DatabaseConfig) =>
      Effect.gen(function* () {
        console.log('INITTING DB', config)
        // First initialize the database
        yield* initialize(config)

        // Then run migrations
        dbLogger('Running migrations as part of initialization')
        const migrateResult = yield* setupDatabase

        if (!migrateResult) {
          return yield* Effect.fail(
            new DatabaseServiceError('Failed to run migrations during initialization')
          )
        }

        return true
      })

    /**
     * Set up the database by running migrations
     */
    const setupDatabase = Effect.tryPromise({
      try: async () => {
        if (!initialized) {
          dbLogger('Database service not initialized')
          return false
        }

        try {
          dbLogger('Running migrations from', migrationsDir)
          await migrate(_db, {
            migrationsFolder: migrationsDir
          })
          dbLogger('Database setup completed successfully')
          return true
        } catch (error) {
          dbLogger('Failed to set up database:', error)
          throw error
        }
      },
      catch: (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return new DatabaseServiceError(`Failed to set up database: ${errorMessage}`)
      }
    })

    /**
     * Close database connections
     */
    const close = Effect.tryPromise({
      try: async () => {
        if (_tursoClient) {
          await _tursoClient.close()
          dbLogger('Database connection closed')
        }
        return true
      },
      catch: (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        dbLogger('Error closing database connection:', errorMessage)
        return new DatabaseServiceError(`Failed to close database: ${errorMessage}`)
      }
    })

    // Project Operations
    const createProject = (project: ProjectInsert) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const [result] = await _db.insert(schema.schema.projects).values(project).returning()
          return result as Project
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to create project:', errorMessage)
          return new DatabaseServiceError(`Failed to create project: ${errorMessage}`)
        }
      })

    const getProject = (id: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.projects.findFirst({
            where: (projects, { eq }) => eq(projects.id, id)
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get project:', errorMessage)
          return new DatabaseServiceError(`Failed to get project: ${errorMessage}`)
        }
      })

    const getProjects = () =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.projects.findMany({
            orderBy: [asc(schema.schema.projects.updatedAt)]
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get projects:', errorMessage)
          return new DatabaseServiceError(`Failed to get projects: ${errorMessage}`)
        }
      })

    const updateProject = (id: string, updates: Partial<ProjectInsert>) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const [updated] = await _db
            .update(schema.schema.projects)
            .set(updates)
            .where(eq(schema.schema.projects.id, id))
            .returning()

          if (!updated) {
            throw new Error('Project not found')
          }

          return updated as Project
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to update project:', { id, error: errorMessage })
          return new DatabaseServiceError(`Failed to update project: ${errorMessage}`)
        }
      })

    const removeProject = (id: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          // Remove the project (tasks and messages will cascade delete)
          await _db.delete(schema.schema.projects).where(eq(schema.schema.projects.id, id))
          return true
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to remove project:', errorMessage)
          return new DatabaseServiceError(`Failed to remove project: ${errorMessage}`)
        }
      })

    // Task Operations
    const createTask = (task: TaskInsert) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const [result] = await _db.insert(schema.schema.tasks).values(task).returning()
          return result as Task
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to create task:', errorMessage)
          return new DatabaseServiceError(`Failed to create task: ${errorMessage}`)
        }
      })

    const getTask = (id: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.tasks.findFirst({
            where: (tasks, { eq }) => eq(tasks.id, id),
            with: {
              project: true,
              chatMessages: {
                orderBy: [asc(schema.schema.chatMessages.createdAt)]
              }
            }
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get task:', errorMessage)
          return new DatabaseServiceError(`Failed to get task: ${errorMessage}`)
        }
      })

    const getTasks = () =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.tasks.findMany({
            with: {
              project: true
            },
            orderBy: [asc(schema.schema.tasks.updatedAt)]
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get tasks:', errorMessage)
          return new DatabaseServiceError(`Failed to get tasks: ${errorMessage}`)
        }
      })

    const getTasksForProject = (projectId: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.tasks.findMany({
            where: (tasks, { eq }) => eq(tasks.projectId, projectId),
            orderBy: [asc(schema.schema.tasks.updatedAt)]
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get tasks for project:', errorMessage)
          return new DatabaseServiceError(`Failed to get tasks for project: ${errorMessage}`)
        }
      })

    const updateTask = (id: string, updates: Partial<TaskInsert>) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const [updated] = await _db
            .update(schema.schema.tasks)
            .set(updates)
            .where(eq(schema.schema.tasks.id, id))
            .returning()

          if (!updated) {
            throw new Error('Task not found')
          }

          return updated as Task
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to update task:', errorMessage)
          return new DatabaseServiceError(`Failed to update task: ${errorMessage}`)
        }
      })

    const removeTask = (id: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          // Remove the task (messages will cascade delete)
          await _db.delete(schema.schema.tasks).where(eq(schema.schema.tasks.id, id))
          return true
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to remove task:', errorMessage)
          return new DatabaseServiceError(`Failed to remove task: ${errorMessage}`)
        }
      })

    // Chat Message Operations
    const createChatMessage = (message: ChatMessageInsert) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const [result] = await _db.insert(schema.schema.chatMessages).values(message).returning()
          return result as ChatMessage
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to create chat message:', errorMessage)
          return new DatabaseServiceError(`Failed to create chat message: ${errorMessage}`)
        }
      })

    const getChatMessage = (id: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.chatMessages.findFirst({
            where: (chatMessages, { eq }) => eq(chatMessages.id, id),
            with: {
              task: true
            }
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get chat message:', errorMessage)
          return new DatabaseServiceError(`Failed to get chat message: ${errorMessage}`)
        }
      })

    const getChatMessagesForTask = (taskId: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.chatMessages.findMany({
            where: (chatMessages, { eq }) => eq(chatMessages.taskId, taskId),
            orderBy: [asc(schema.schema.chatMessages.createdAt)]
          })
          return result
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get chat messages for task:', errorMessage)
          return new DatabaseServiceError(`Failed to get chat messages for task: ${errorMessage}`)
        }
      })

    const getLatestSessionIdForTask = (taskId: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          const result = await _db.query.chatMessages.findFirst({
            where: and(
              eq(schema.schema.chatMessages.taskId, taskId),
              isNotNull(schema.schema.chatMessages.sessionId)
            ),
            orderBy: [desc(schema.schema.chatMessages.createdAt)],
            columns: {
              sessionId: true
            }
          })
          return result?.sessionId || null
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to get latest session ID for task:', errorMessage)
          return new DatabaseServiceError(
            `Failed to get latest session ID for task: ${errorMessage}`
          )
        }
      })

    const removeChatMessage = (id: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!initialized) {
            throw new Error('Database service not initialized')
          }

          await _db.delete(schema.schema.chatMessages).where(eq(schema.schema.chatMessages.id, id))
          return true
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          dbLogger('Failed to remove chat message:', errorMessage)
          return new DatabaseServiceError(`Failed to remove chat message: ${errorMessage}`)
        }
      })

    /**
     * Check if service is initialized
     */
    const isInitialized = Effect.sync(() => {
      return initialized
    })

    /**
     * Clean up resources
     */
    const cleanup = Effect.gen(function* () {
      dbLogger('Cleaning up DatabaseService resources')
      if (initialized) {
        yield* close
        initialized = false
      }
    })

    /**
     * Helper to prepare SQL statements
     */
    const prepare = (sql: string) => {
      const flattenParams = (params: any[]) => params.map((p) => (Array.isArray(p) ? p[0] : p))

      return {
        all: async (...params: any[]) => {
          const result = await _tursoClient.execute({
            sql,
            args: flattenParams(params)
          })
          return result.rows
        },
        get: async (...params: any[]) => {
          const result = await _tursoClient.execute({
            sql,
            args: flattenParams(params)
          })
          return result.rows?.[0] || null
        },
        execute: async (...params: any[]) => {
          const result = await _tursoClient.execute({
            sql,
            args: flattenParams(params)
          })
          return result.rows
        },
        values: async (...params: any[]) => {
          const result = await _tursoClient.execute({
            sql,
            args: flattenParams(params)
          })
          return result.rows
        },
        run: async (...params: any[]) => {
          const result = await _tursoClient.execute({
            sql,
            args: flattenParams(params)
          })
          return result.rows
        }
      } as const
    }

    // Return the service API
    return {
      initialize,
      initAndMigrate,
      setupDatabase,
      close,
      // Project operations
      createProject,
      getProject,
      getProjects,
      updateProject,
      removeProject,
      // Task operations
      createTask,
      getTask,
      getTasks,
      getTasksForProject,
      updateTask,
      removeTask,
      // Chat message operations
      createChatMessage,
      getChatMessage,
      getChatMessagesForTask,
      getLatestSessionIdForTask,
      removeChatMessage,
      // Utility
      isInitialized,
      cleanup,
      prepare
    }
  })
}) {}

export const DatabaseServiceLive = DatabaseService.Default
