import { getDatabasePath } from './utils/index.js'
import { Config, ConfigProvider } from 'effect'
import { app } from 'electron'

// Create a config provider from Vite's import.meta.env
export const viteConfigProvider = () => {
  const configMap = new Map<string, string>()

  // Access all environment variables from import.meta.env
  // This assumes import.meta.env contains the environment variables
  for (const [key, value] of Object.entries(import.meta.env)) {
    if (typeof value === 'string') {
      configMap.set(key, value)
    }
  }

  return ConfigProvider.fromMap(configMap)
}

// Define application configs
export const sentryConfig = Config.map(
  Config.all([
    Config.option(Config.string('VITE_SENTRY_DSN')),
    Config.succeed(process.env.NODE_ENV)
  ]),
  ([dsn, environment]) => ({
    dsn: dsn._tag === 'Some' ? dsn.value : undefined,
    environment,
    release: app.getVersion(),
    debug: process.env.NODE_ENV !== 'production',
    maxBreadcrumbs: 100,
    maxAgeDays: 30,
    maxQueueSize: 30
  })
)

// PostHog configuration
export const posthogConfig = Config.map(
  Config.all([
    Config.option(Config.string('VITE_POSTHOG_API_KEY')),
    Config.option(Config.string('VITE_POSTHOG_HOST')),
    Config.succeed(process.env.NODE_ENV)
  ]),
  ([apiKeyOption, hostOption, environment]) => ({
    apiKey: apiKeyOption._tag === 'Some' ? apiKeyOption.value : undefined,
    host: hostOption._tag === 'Some' ? hostOption.value : 'https://us.i.posthog.com',
    debug: process.env.NODE_ENV !== 'production',
    enableExceptionAutocapture: false,
    flushAt: environment === 'production' ? 20 : 1, // Smaller batch in development
    flushInterval: environment === 'production' ? 10000 : 3000 // Shorter interval in development
  })
)

// Update service configuration
export const updateConfig = Config.map(
  Config.option(Config.string('VITE_CONVEYOR_UPDATE_SITE')),
  (updateSiteURL) => ({
    updateSiteURL: updateSiteURL._tag === 'Some' ? updateSiteURL.value : undefined,
    checkInterval: 3600000, // 1 hour in milliseconds
    // checkInterval: 50, // 10 seconds in milliseconds
    automaticChecks: true
  })
)

/**
 * Logger configuration using Effect's Config system
 */
export const loggerConfig = Config.map(
  Config.all([
    Config.boolean('LOG_TO_FILE').pipe(Config.withDefault(true)),
    Config.option(Config.string('LOG_FILE_PATH')),
    Config.string('LOG_FILE_LEVEL').pipe(Config.withDefault('info')),
    Config.string('LOG_CONSOLE_LEVEL').pipe(
      Config.withDefault(process.env.NODE_ENV === 'development' ? 'debug' : 'info')
    ),
    Config.number('LOG_MAX_FILE_SIZE').pipe(Config.withDefault(10 * 1024 * 1024)), // 10MB
    Config.number('LOG_MAX_FILES').pipe(Config.withDefault(5))
  ]),
  ([logToFile, logFilePathOption, fileLogLevel, consoleLogLevel, maxFileSize, maxFiles]) => ({
    logToFile,
    logFilePath: logFilePathOption._tag === 'Some' ? logFilePathOption.value : undefined,
    fileLogLevel: fileLogLevel as 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'none',
    consoleLogLevel: consoleLogLevel as 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'none',
    maxFileSize,
    maxFiles,
    prettyLogging: process.env.NODE_ENV === 'development',
    logMetadata: true
  })
)
// Add more configs as needed
// export const otherConfig = ...
