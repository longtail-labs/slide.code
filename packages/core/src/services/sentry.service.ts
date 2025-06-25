import { Effect, Schema } from 'effect'
import { app } from 'electron'
import * as Sentry from '@sentry/electron/main'
import type { Scope, ErrorEvent, EventHint } from '@sentry/core'

/**
 * Schema for Sentry configuration
 */
export const SentryConfigSchema = Schema.Struct({
  dsn: Schema.String,
  debug: Schema.optionalWith(Schema.Boolean, { exact: true, default: () => false }),
  environment: Schema.optionalWith(Schema.String, { exact: true }),
  release: Schema.optionalWith(Schema.String, { exact: true }),
  maxBreadcrumbs: Schema.optionalWith(Schema.Number, { exact: true, default: () => 100 }),
  maxAgeDays: Schema.optionalWith(Schema.Number, { exact: true, default: () => 30 }),
  maxQueueSize: Schema.optionalWith(Schema.Number, { exact: true, default: () => 30 })
})

export type SentryConfig = Schema.Schema.Type<typeof SentryConfigSchema>

/**
 * Errors that can be thrown by the Sentry service
 */
export class SentryServiceError extends Error {
  readonly _tag = 'SentryServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'SentryServiceError'
  }
}

/**
 * SentryService for error tracking and monitoring
 */
export class SentryService extends Effect.Service<SentryService>()('SentryService', {
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('🦅 SentryService started')

    let initialized = false

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        Effect.logInfo('🦅 Cleaning up SentryService resources')
        if (initialized) {
          try {
            Sentry.close()
            initialized = false
            Effect.logInfo('🦅 Sentry SDK closed successfully')
          } catch (error) {
            Effect.logError('Error closing Sentry:', error)
          }
        }
        Effect.logInfo('🦅 SentryService cleaned up successfully')
      })
    )

    /**
     * Initialize Sentry in the main process
     */
    const initialize = (config: SentryConfig) =>
      Effect.try({
        try: () => {
          Effect.logInfo('Initializing Sentry with DSN', config.dsn)

          Sentry.init({
            dsn: config.dsn,
            debug: config.debug,
            environment: config.environment ?? process.env.NODE_ENV,
            release: config.release ?? app.getVersion(),
            maxBreadcrumbs: config.maxBreadcrumbs,
            // autoSessionTracking: config.autoSessionTracking,
            transportOptions: {
              maxAgeDays: config.maxAgeDays,
              maxQueueSize: config.maxQueueSize,
              flushAtStartup: true
            },
            beforeSend: (event: ErrorEvent, _: EventHint): ErrorEvent | null => {
              // Add app metadata to all events
              event.tags = {
                ...event.tags,
                electron: process.versions.electron,
                chrome: process.versions.chrome,
                node: process.versions.node
              }
              return event
            }
          })

          initialized = true
          return true
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          Effect.logError('Failed to initialize Sentry:', errorMessage)
          return new SentryServiceError(`Failed to initialize Sentry: ${errorMessage}`)
        }
      })

    /**
     * Capture an exception in Sentry
     */
    const captureException = (error: Error, context?: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          if (!initialized) {
            Effect.logWarning('Sentry not initialized, cannot capture exception')
            return
          }

          if (context) {
            Sentry.withScope((scope: Scope) => {
              Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value)
              })
              Sentry.captureException(error)
            })
            return
          }

          return Sentry.captureException(error)
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          Effect.logError('Failed to capture exception:', errorMessage)
          return new SentryServiceError(`Failed to capture exception: ${errorMessage}`)
        }
      })

    /**
     * Set user information in Sentry
     */
    const setUser = (user: { id?: string; email?: string; username?: string }) =>
      Effect.try({
        try: () => {
          if (!initialized) {
            Effect.logWarning('Sentry not initialized, cannot set user')
            return
          }

          Sentry.setUser(user)
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          Effect.logError('Failed to set user:', errorMessage)
          return new SentryServiceError(`Failed to set user: ${errorMessage}`)
        }
      })

    /**
     * Add breadcrumb to Sentry
     */
    const addBreadcrumb = (breadcrumb: {
      category?: string
      message: string
      data?: Record<string, unknown>
      level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
    }) =>
      Effect.try({
        try: () => {
          if (!initialized) {
            Effect.logWarning('Sentry not initialized, cannot add breadcrumb')
            return
          }

          Sentry.addBreadcrumb({
            category: breadcrumb.category ?? 'default',
            message: breadcrumb.message,
            data: breadcrumb.data,
            level: breadcrumb.level ?? 'info'
          })
        },
        catch: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          Effect.logError('Failed to add breadcrumb:', errorMessage)
          return new SentryServiceError(`Failed to add breadcrumb: ${errorMessage}`)
        }
      })

    /**
     * Check if Sentry is initialized
     */
    const isInitialized = Effect.sync(() => {
      return initialized
    })

    // Return the service API
    return {
      initialize,
      captureException,
      setUser,
      addBreadcrumb,
      isInitialized
      // cleanup is now handled by the finalizer
    }
  })
}) {}
