import { Effect, Schema } from 'effect'
import { initialize as initializeAptabase, trackEvent } from '@aptabase/electron/main'
import { getEnvironmentInfo, EnvironmentInfo } from '../utils/environment.js'
import { DefaultLoggerLayer } from '../logger.js'

/**
 * Schema for Aptabase configuration
 */
export const AptabaseConfigSchema = Schema.Struct({
  appKey: Schema.String,
  debug: Schema.optionalWith(Schema.Boolean, { exact: true, default: () => false })
})

export type AptabaseConfig = Schema.Schema.Type<typeof AptabaseConfigSchema>

/**
 * Initialize Aptabase with the given configuration
 */
export const initializeAptabaseEffect = (config: AptabaseConfig) =>
  Effect.gen(function* () {
    yield* Effect.logInfo('📊 Initializing Aptabase analytics')

    try {
      // Initialize Aptabase with the app key
      initializeAptabase(config.appKey)

      // Get environment info for initial tracking
      const environmentInfo = yield* Effect.promise(() => getEnvironmentInfo())

      yield* Effect.logInfo(
        `📊 Aptabase initialized - Environment: ${environmentInfo.osName} ${environmentInfo.osVersion}, App ${environmentInfo.appVersion}`
      )

      // Track app launched event
      yield* trackAptabaseEvent('app_launched', {
        app_version: environmentInfo.appVersion,
        os_name: environmentInfo.osName,
        os_version: environmentInfo.osVersion,
        electron_version: process.versions.electron,
        is_debug: environmentInfo.isDebug ? 'true' : 'false'
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      yield* Effect.logError('Failed to initialize Aptabase:', errorMessage)
      return yield* Effect.fail(new Error(`Failed to initialize Aptabase: ${errorMessage}`))
    }
  }).pipe(Effect.provide(DefaultLoggerLayer))

/**
 * Track an event with Aptabase
 */
export const trackAptabaseEvent = (
  eventName: string,
  properties?: Record<string, string | number>
) =>
  Effect.gen(function* () {
    try {
      yield* Effect.logDebug(`📊 Tracking event: ${eventName}`, properties)

      // Track the event
      trackEvent(eventName, properties)

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      yield* Effect.logWarning(`Failed to track event ${eventName}:`, errorMessage)
      return false
    }
  }).pipe(Effect.provide(DefaultLoggerLayer))

/**
 * Track app launched event with environment info
 */
export const trackAppLaunched = () =>
  Effect.gen(function* () {
    const environmentInfo = yield* Effect.promise(() => getEnvironmentInfo())

    return yield* trackAptabaseEvent('app_launched', {
      app_version: environmentInfo.appVersion,
      os_name: environmentInfo.osName,
      os_version: environmentInfo.osVersion,
      electron_version: process.versions.electron,
      node_version: environmentInfo.nodeVersion || 'unknown',
      architecture: environmentInfo.architecture || 'unknown',
      is_debug: environmentInfo.isDebug ? 'true' : 'false',
      is_beta: environmentInfo.isBeta ? 'true' : 'false',
      is_prod: environmentInfo.isProd ? 'true' : 'false',
      is_dev: environmentInfo.isDev ? 'true' : 'false'
    })
  }).pipe(Effect.provide(DefaultLoggerLayer))

/**
 * Track an error event
 */
export const trackError = (error: Error, context?: Record<string, string | number>) =>
  Effect.gen(function* () {
    return yield* trackAptabaseEvent('error_occurred', {
      error_name: error.name,
      error_message: error.message.substring(0, 200), // Limit message length
      ...context
    })
  }).pipe(Effect.provide(DefaultLoggerLayer))
