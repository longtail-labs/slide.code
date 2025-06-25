import { Effect, Schema } from 'effect'
import { app } from 'electron'
import { PostHog } from 'posthog-node'
import { DefaultLoggerLayer } from '../logger.js'
import { initialize as initializeAptabase, trackEvent } from '@aptabase/electron/main'
import { getEnvironmentInfo, EnvironmentInfo } from '../utils/environment.js'
/**
 * Schema for PostHog configuration
 */
export const PostHogConfigSchema = Schema.Struct({
  apiKey: Schema.String,
  host: Schema.optionalWith(Schema.String, {
    exact: true,
    default: () => 'https://us.i.posthog.com'
  }),
  debug: Schema.optionalWith(Schema.Boolean, { exact: true, default: () => false }),
  enableExceptionAutocapture: Schema.optionalWith(Schema.Boolean, {
    exact: true,
    default: () => true
  }),
  flushAt: Schema.optionalWith(Schema.Number, { exact: true, default: () => 20 }),
  flushInterval: Schema.optionalWith(Schema.Number, { exact: true, default: () => 10000 })
})

export type PostHogConfig = Schema.Schema.Type<typeof PostHogConfigSchema>

/**
 * Errors that can be thrown by the PostHog service
 */
export class PostHogServiceError extends Error {
  readonly _tag = 'PostHogServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'PostHogServiceError'
  }
}

/**
 * PostHogService for analytics and error tracking
 */
export class PostHogService extends Effect.Service<PostHogService>()('PostHogService', {
  dependencies: [DefaultLoggerLayer],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('📊 PostHogService started')

    let client: PostHog | null = null
    let initialized = false
    // Store environment info once
    let environmentInfo: EnvironmentInfo | null = null

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('📊 Cleaning up PostHogService resources')
        if (client) {
          try {
            client.shutdown()
            client = null
            initialized = false
            environmentInfo = null
          } catch (error) {}
        }
        yield* Effect.logInfo('📊 PostHogService cleaned up successfully')
      })
    )

    /**
     * Helper function to convert environment info to event properties
     */
    const getEventProperties = (envInfo: EnvironmentInfo): Record<string, unknown> => ({
      app_version: envInfo.appVersion,
      electron_version: process.versions.electron,
      node_version: envInfo.nodeVersion,
      os_name: envInfo.osName,
      os_version: envInfo.osVersion,
      locale: envInfo.locale,
      browser_name: envInfo.engineName,
      browser_version: envInfo.engineVersion,
      is_debug: envInfo.isDebug,
      architecture: envInfo.architecture,
      // System details
      total_memory_gb: envInfo.totalMemoryGB,
      free_memory_gb: envInfo.freeMemoryGB,
      device_type: envInfo.deviceType,
      cpu_model: envInfo.cpuModel,
      cpu_cores: envInfo.cpuCores,
      gpu_info: envInfo.gpuInfo,
      system_uptime_hours: envInfo.systemUptimeHours,
      timezone: envInfo.timezone,
      // Release channel
      is_beta: envInfo.isBeta,
      is_prod: envInfo.isProd,
      is_dev: envInfo.isDev
    })

    /**
     * Initialize PostHog client
     */
    const initialize = (config: PostHogConfig) =>
      Effect.gen(function* () {
        try {
          yield* Effect.logInfo('Initializing PostHog with API key')

          client = new PostHog(config.apiKey, {
            host: config.host,
            flushAt: config.flushAt,
            flushInterval: config.flushInterval,
            enableExceptionAutocapture: config.enableExceptionAutocapture
          })

          initializeAptabase('A-US-4488936370')

          if (config.debug) {
            client.debug()
          }

          // Setup error handling
          client.on('error', (err) => {
            Effect.logError('PostHog error:', err)
          })

          // Gather environment info for logging and first event
          environmentInfo = yield* Effect.promise(() => getEnvironmentInfo())
          yield* Effect.logInfo(
            `Environment: ${environmentInfo.osName} ${environmentInfo.osVersion}, Electron ${process.versions.electron}, App ${environmentInfo.appVersion}`
          )

          initialized = true
          return true
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError('Failed to initialize PostHog:', errorMessage)
          return new PostHogServiceError(`Failed to initialize PostHog: ${errorMessage}`)
        }
      })

    /**
     * Capture an event in PostHog
     */
    const captureEvent = (
      eventName: string,
      distinctId?: string,
      properties?: Record<string, unknown>
    ) =>
      Effect.gen(function* () {
        try {
          if (!initialized || !client || !environmentInfo) {
            yield* Effect.logWarning('PostHog not initialized, cannot capture event')
            return
          }

          // Use app ID as a default if no distinctId is provided
          const id = distinctId || app.getAppPath()

          // Also track the event in Aptabase
          trackEvent(eventName, {
            ...properties,
            app_version: environmentInfo.appVersion
          })

          return client.capture({
            distinctId: id,
            event: eventName,
            properties: {
              ...properties,
              ...getEventProperties(environmentInfo)
            }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError('Failed to capture event:', errorMessage)
          return new PostHogServiceError(`Failed to capture event: ${errorMessage}`)
        }
      })

    /**
     * Capture app launched event
     */
    const captureAppLaunched = (distinctId?: string) =>
      Effect.gen(function* () {
        if (!environmentInfo) {
          environmentInfo = yield* Effect.promise(() => getEnvironmentInfo())
        }

        return yield* captureEvent('app_launched', distinctId, {
          app_version: environmentInfo.appVersion
        })
      })

    /**
     * Capture an exception in PostHog
     */
    const captureException = (
      error: Error,
      distinctId?: string,
      properties?: Record<string, unknown>
    ) =>
      Effect.gen(function* () {
        try {
          if (!initialized || !client || !environmentInfo) {
            yield* Effect.logWarning('PostHog not initialized, cannot capture exception')
            return
          }

          // Use app ID as a default if no distinctId is provided
          const id = distinctId || app.getAppPath()

          return client.captureException(error, id, {
            ...properties,
            ...getEventProperties(environmentInfo)
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError('Failed to capture exception:', errorMessage)
          return new PostHogServiceError(`Failed to capture exception: ${errorMessage}`)
        }
      })

    /**
     * Identify a user in PostHog
     */
    const identify = (distinctId: string, properties?: Record<string, unknown>) =>
      Effect.gen(function* () {
        try {
          if (!initialized || !client || !environmentInfo) {
            yield* Effect.logWarning('PostHog not initialized, cannot identify user')
            return
          }

          return client.identify({
            distinctId,
            properties: {
              ...properties,
              ...getEventProperties(environmentInfo)
            }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError('Failed to identify user:', errorMessage)
          return new PostHogServiceError(`Failed to identify user: ${errorMessage}`)
        }
      })

    /**
     * Flush the PostHog queue immediately
     */
    const flush = () =>
      Effect.gen(function* () {
        try {
          if (!initialized || !client) {
            yield* Effect.logWarning('PostHog not initialized, cannot flush')
            return
          }

          return client.flush()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError('Failed to flush PostHog queue:', errorMessage)
          return new PostHogServiceError(`Failed to flush PostHog queue: ${errorMessage}`)
        }
      })

    /**
     * Check if PostHog is initialized
     */
    const isInitialized = Effect.sync(() => {
      return initialized
    })

    // Return the service API
    return {
      initialize,
      captureEvent,
      captureAppLaunched,
      captureException,
      identify,
      flush,
      isInitialized
      // cleanup is now handled by the finalizer
    }
  })
}) {}
