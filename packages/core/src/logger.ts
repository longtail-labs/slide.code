import { Logger, LogLevel, Effect, Layer } from 'effect'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Helper function to get the default log directory based on platform
 */
export function getDefaultLogDirectory(): string {
  const appName = 'slide'

  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Logs', appName)
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', appName, 'logs')
    default:
      return path.join(os.homedir(), '.config', appName, 'logs')
  }
}

/**
 * A simple file writer that writes log messages to a file
 */
class FileWriter {
  private maxSize: number
  private maxFiles: number

  constructor(
    private filePath: string,
    options: { maxSize?: number; maxFiles?: number } = {}
  ) {
    this.maxSize = options.maxSize || 10 * 1024 * 1024 // 10MB default
    this.maxFiles = options.maxFiles || 5

    // Ensure directory exists
    const logDir = path.dirname(filePath)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    // Create file if it doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '')
    }
  }

  /**
   * Write a log entry to the file
   */
  write(message: string): void {
    try {
      // Check file size and rotate if needed
      this.checkRotation()

      // Append to file
      fs.appendFileSync(this.filePath, message + '\n')
    } catch (error) {
      console.error('Error writing to log file:', error)
    }
  }

  /**
   * Check if file rotation is needed
   */
  private checkRotation(): void {
    try {
      const stats = fs.statSync(this.filePath)
      if (stats.size >= this.maxSize) {
        this.rotateFile()
      }
    } catch (error) {
      console.error('Error checking file size:', error)
    }
  }

  /**
   * Rotate log files
   */
  rotateFile(): void {
    try {
      const logDir = path.dirname(this.filePath)
      const ext = path.extname(this.filePath)
      const baseName = path.basename(this.filePath, ext)

      // Shift existing backups
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(logDir, `${baseName}.${i}${ext}`)
        const newFile = path.join(logDir, `${baseName}.${i + 1}${ext}`)

        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile)
        }
      }

      // Rename current log to .1
      const backupFile = path.join(logDir, `${baseName}.1${ext}`)
      fs.renameSync(this.filePath, backupFile)

      // Create new empty log file
      fs.writeFileSync(this.filePath, '')
    } catch (error) {
      console.error('Error rotating log file:', error)
    }
  }

  /**
   * Returns the path to the log file
   */
  getPath(): string {
    return this.filePath
  }
}

// Configuration type matching our config.ts
export type LoggerConfig = {
  logToFile: boolean
  logFilePath?: string
  fileLogLevel: 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'none'
  consoleLogLevel: 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'none'
  maxFileSize: number
  maxFiles: number
  prettyLogging: boolean
  logMetadata: boolean
}

// Mapping from string log levels to Effect LogLevel
const logLevelMap: Record<string, typeof LogLevel.Debug> = {
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warning: LogLevel.Warning,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
  none: LogLevel.None
}

let fileWriter: FileWriter | null = null

/**
 * Safely serialize any value to a string, handling circular references
 * and properly formatting Maps, Sets, and other complex objects
 */
function safeSerialize(value: any, depth: number = 0): string {
  // Maximum depth to prevent excessive recursion
  const MAX_DEPTH = 2

  // Return a placeholder for deep nesting
  if (depth > MAX_DEPTH) {
    return '[nested]'
  }

  // Handle null/undefined
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  // Handle Error objects
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`
  }

  // Handle Maps (only serialize top level)
  if (value instanceof Map) {
    if (depth > 0) return '[Map]'
    const count = value.size
    if (count > 5) return `Map(${count} items)`

    const entries = Array.from(value.entries())
      .slice(0, 5)
      .map(([k, v]) => `${safeSerialize(k, depth + 1)}=>${safeSerialize(v, depth + 1)}`)
      .join(', ')
    return `Map(${entries})`
  }

  // Handle Sets
  if (value instanceof Set) {
    if (depth > 0) return '[Set]'
    const count = value.size
    if (count > 5) return `Set(${count} items)`

    const values = Array.from(value)
      .slice(0, 5)
      .map((v) => safeSerialize(v, depth + 1))
      .join(', ')
    return `Set(${values})`
  }

  // Handle Effect internal objects - detect common Effect patterns
  if (typeof value === 'object' && value !== null) {
    // Detect Effect internal objects
    if (
      value._id &&
      (value._id === 'FiberId' ||
        value._id === 'Context' ||
        value._id === 'Effect' ||
        value._id === 'MutableRef')
    ) {
      return `[Effect:${value._id}]`
    }

    // For Array, limit output
    if (Array.isArray(value)) {
      if (depth > 0) return `[Array(${value.length})]`
      if (value.length > 5) {
        return `[Array(${value.length})]`
      }
      const items = value
        .slice(0, 5)
        .map((v) => safeSerialize(v, depth + 1))
        .join(', ')
      return `[${items}]`
    }

    // For general objects, limit properties
    try {
      if (depth > 0) {
        const keys = Object.keys(value)
        return keys.length > 0 ? `{${keys.length} props}` : '{}'
      }

      const keys = Object.keys(value)
      if (keys.length > 5) {
        return `{${keys.length} props}`
      }

      const pairs = keys
        .slice(0, 5)
        .map((key) => {
          const val = safeSerialize(value[key], depth + 1)
          return `${key}:${val}`
        })
        .join(', ')

      return `{${pairs}}`
    } catch (err) {
      return String(value)
    }
  }

  // Handle primitives
  return String(value)
}

/**
 * Create a custom logger that logs to both console and file based on config
 */
export const createCustomLogger = (config: LoggerConfig) => {
  // Initialize file writer if needed
  if (config.logToFile) {
    const logFilePath = config.logFilePath || path.join(getDefaultLogDirectory(), 'main.log')
    fileWriter = new FileWriter(logFilePath, {
      maxSize: config.maxFileSize,
      maxFiles: config.maxFiles
    })
  }

  // Log application metadata if enabled
  if (config.logMetadata && fileWriter) {
    const metadataEntry = [
      `[${new Date().toISOString()}] [INFO] Application started`,
      `platform=${process.platform}`,
      `arch=${process.arch}`,
      `electron=${process.versions.electron}`,
      `node=${process.versions.node}`,
      `chrome=${process.versions.chrome}`
    ].join(' ')

    fileWriter.write(metadataEntry)
  }

  // Create and return the custom logger
  return Logger.make<unknown, void>(({ logLevel, message, cause, context, spans }) => {
    try {
      // Format the log message
      const timestamp = new Date().toISOString()
      const spanInfo = Object.entries(spans || {})
        .map(([key, value]) => `${key}=${value}ms`)
        .join(' ')

      const annotations = Object.entries(context || {})
        .map(([key, value]) => `${key}=${safeSerialize(value)}`)
        .join(' ')

      const messageText = Array.isArray(message) ? message.join(' ') : String(message)
      const causeText = cause ? `\nCause: ${safeSerialize(cause)}` : ''

      // Log to console based on console log level
      const consoleLogLevel = logLevelMap[config.consoleLogLevel]
      if (consoleLogLevel && logLevel.syslog >= consoleLogLevel.syslog) {
        const consoleMessage = `[${timestamp}] [${logLevel.label}] ${messageText}${causeText}`
        switch (logLevel.label) {
          case 'DEBUG':
            console.debug(consoleMessage, spanInfo, annotations)
            break
          case 'INFO':
            console.info(consoleMessage, spanInfo, annotations)
            break
          case 'WARN':
            console.warn(consoleMessage, spanInfo, annotations)
            break
          case 'ERROR':
          case 'FATAL':
            console.error(consoleMessage, spanInfo, annotations)
            break
        }
      }

      // Log to file based on file log level
      if (fileWriter) {
        const fileLogLevel = logLevelMap[config.fileLogLevel]
        if (fileLogLevel && logLevel.syslog >= fileLogLevel.syslog) {
          const logEntry = `[${timestamp}] [${logLevel.label}] ${messageText}${causeText} ${spanInfo} ${annotations}`
          fileWriter.write(logEntry)
        }
      }
    } catch (error) {
      console.error('Error in custom logger:', error)
    }
  })
}

/**
 * Force a log file rotation
 */
export const rotateLogFile = (): boolean => {
  if (!fileWriter) {
    console.warn('Cannot rotate logs - file logging not enabled')
    return false
  }

  fileWriter.rotateFile()
  return true
}

/**
 * Get log file path
 */
export const getLogFilePath = (): string | null => {
  if (!fileWriter) {
    return null
  }
  return fileWriter.getPath()
}

/**
 * Create a logger layer that replaces the default logger with our custom logger
 */
export const createLoggerLayer = (config: LoggerConfig): Layer.Layer<never, never, never> => {
  const customLogger = createCustomLogger(config)
  return Logger.replace(Logger.defaultLogger, customLogger)
}

/**
 * Simple scope-specific logger creator
 */
export const createScopedLogger = (scope: string) => {
  return {
    debug: (message: string, ...args: any[]) => Effect.logDebug(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => Effect.logInfo(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => Effect.logWarning(`[${scope}] ${message}`, ...args),
    error: (message: string | Error, ...args: any[]) => {
      const errorMessage = message instanceof Error ? message.message : message
      return Effect.logError(`[${scope}] ${errorMessage}`, ...args)
    }
  }
}

/**
 * Create a simple default logger that can be used immediately
 * This doesn't require configuration but has reasonable defaults including file logging
 */
export const createDefaultLogger = () => {
  // Set up file writer with sensible defaults
  const logFilePath = path.join(getDefaultLogDirectory(), 'main.log')

  // Create file writer with default settings
  const defaultFileWriter = new FileWriter(logFilePath, {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  })
  console.log(`Default file logging enabled at: ${logFilePath}`)

  // Log application metadata
  const metadataEntry = [
    `[${new Date().toISOString()}] [INFO] Application started`,
    `platform=${process.platform}`,
    `arch=${process.arch}`,
    `electron=${process.versions.electron}`,
    `node=${process.versions.node}`,
    `chrome=${process.versions.chrome}`
  ].join(' ')

  defaultFileWriter.write(metadataEntry)

  // Store file writer in the global variable for other functions to use
  fileWriter = defaultFileWriter

  // Return a logger that logs to both console and file
  return Logger.make<unknown, void>(({ logLevel, message, context, spans }) => {
    try {
      const timestamp = new Date().toISOString()
      const messageText = Array.isArray(message) ? message.join(' ') : String(message)
      // const causeText = cause ? `\nCause: ${safeSerialize(cause)}` : ''

      // Format context annotations if present
      const annotations = context
        ? Object.entries(context)
            .map(([key, value]) => `${key}=${safeSerialize(value)}`)
            .join(' ')
        : ''

      // Format spans if present
      const spanInfo = spans
        ? Object.entries(spans)
            .map(([key, value]) => `${key}=${value}ms`)
            .join(' ')
        : ''

      const logEntryBase = `[${timestamp}] [${logLevel.label}] ${messageText}`

      // Write to console
      switch (logLevel.label) {
        case 'DEBUG':
          console.debug(logEntryBase, annotations, spanInfo)
          break
        case 'INFO':
          console.info(logEntryBase, annotations, spanInfo)
          break
        case 'WARN':
          console.warn(logEntryBase, annotations, spanInfo)
          break
        case 'ERROR':
        case 'FATAL':
          console.error(logEntryBase, annotations, spanInfo)
          break
      }

      // Write to file with all details
      defaultFileWriter.write(`${logEntryBase} ${annotations} ${spanInfo}`.trim())
    } catch (error) {
      console.error('Error in default logger:', error)
    }
  })
}

/**
 * Default logger layer for immediate use
 * This can be imported by any file without creating circular dependencies
 */
export const DefaultLoggerLayer = Logger.replace(Logger.defaultLogger, createDefaultLogger())
