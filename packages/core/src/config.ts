import { getDatabasePath, getDrizzleFolder } from '@slide.code/shared'
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

// Aptabase configuration
export const aptabaseConfig = Config.map(
  Config.all([
    Config.string('VITE_APTABASE_APP_KEY').pipe(Config.withDefault('A-US-6262631782')),
    Config.succeed(process.env.NODE_ENV)
  ]),
  ([appKey, environment]) => ({
    appKey,
    debug: environment !== 'production'
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

/**
 * Database configuration using Effect's Config system
 */
export const databaseConfig = Config.map(
  Config.all([
    Config.option(Config.string('DATABASE_PATH')),
    Config.boolean('DATABASE_IN_MEMORY').pipe(Config.withDefault(false))
  ]),
  ([databasePathOption, inMemory]) => ({
    dataDir:
      databasePathOption._tag === 'Some' ? databasePathOption.value : getDatabasePath(inMemory),
    migrationsDir: getDrizzleFolder(),
    inMemory
  })
)
